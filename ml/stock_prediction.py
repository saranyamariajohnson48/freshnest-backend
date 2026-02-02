import sys
import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta

def get_season(month):
    if month in [3, 4, 5, 6]:
        return 'Summer'
    elif month in [7, 8, 9]:
        return 'Monsoon'
    elif month in [10, 11]:
        return 'Festival' # Diwali/Navratri usually
    else:
        return 'Winter'

def process_data(products, sales):
    # Convert to DataFrames
    df_products = pd.DataFrame(products)
    df_sales = pd.DataFrame(sales)

    if df_sales.empty:
        return []

    # Ensure date is datetime
    df_sales['date'] = pd.to_datetime(df_sales['date'])
    
    # Aggregate sales by product and month
    df_sales['month'] = df_sales['date'].dt.month
    df_sales['year'] = df_sales['date'].dt.year
    
    # Monthly aggregate
    monthly_sales = df_sales.groupby(['product_sku', 'year', 'month'])['quantity_sold'].sum().reset_index()
    
    predictions = []
    
    # Train a simple model for each product (or a global one if enough data)
    # For this MVP, we will try to train a global model but with Product ID encoding if possible, 
    # but for simplicity/robustness on small data, we'll loop per product or fallback to simple rules if data is scarce.
    
    # Better approach for small data: Global model with features.
    
    # Feature Engineering
    monthly_sales['season'] = monthly_sales['month'].apply(get_season)
    monthly_sales['season_code'] = monthly_sales['season'].astype('category').cat.codes
    
    # We want to predict 'quantity_sold' for the NEXT month.
    # Let's shift the target.
    # But for a "current state" prediction, we can just use the trained model on "Next Month's" feature.
    
    # Let's do a simple per-product logic for now to avoid complexity with sparse data.
    unique_skus = df_products['sku'].unique()
    
    results = []
    
    for sku in unique_skus:
        product_data = df_products[df_products['sku'] == sku].iloc[0]
        p_sales = monthly_sales[monthly_sales['product_sku'] == sku].sort_values(by=['year', 'month'])
        
        current_stock = product_data.get('stock', 0)
        product_name = product_data.get('name', 'Unknown')
        
        # Determine next month
        today = datetime.now()
        next_month_date = today.replace(day=1) + timedelta(days=32)
        next_month = next_month_date.month
        next_season = get_season(next_month)
        
        predicted_demand = 0
        confidence = 0.5
        
        if len(p_sales) >= 3:
            # Prepare training data: X = [Month, SeasonCode, Lag1, Lag2], y = Quantity
            # Simple approach: Average of last 3 months weighted by seasonality if possible.
            # Using Random Forest
            
            # Create lag features
            p_sales['lag1'] = p_sales['quantity_sold'].shift(1)
            p_sales['lag2'] = p_sales['quantity_sold'].shift(2)
            p_sales.dropna(inplace=True)
            
            if len(p_sales) > 5:
                # Train model
                X = p_sales[['month', 'season_code', 'lag1', 'lag2']]
                y = p_sales['quantity_sold']
                
                model = RandomForestRegressor(n_estimators=50, random_state=42)
                model.fit(X, y)
                
                # Predict for next month
                # We need the most recent lags
                last_row = p_sales.iloc[-1]
                latest_qty = last_row['quantity_sold']
                prev_qty = last_row['lag1']
                
                # Next month season code (need consistent encoding, hacky map for now)
                # Map season to code manually to be safe if categories mismatched
                season_map = {'Summer': 0, 'Monsoon': 1, 'Festival': 2, 'Winter': 3} # Example mapping, risky if auto-encoded differently
                # Re-do encoding safely if sticking to this.
                # Simplified: Just mean of same month last year + recent trend?
                
                # Let's stick to simple Moving Average + Seasonality Multiplier for robustness if ML fails/is overkill
                # But user asked for ML. Let's use the RFC.
                
                # Infer season code from the training set to be consistent
                season_codes = dict(zip(p_sales['season'], p_sales['season_code']))
                next_season_code = season_codes.get(next_season, 0)
                
                X_next = pd.DataFrame([{
                    'month': next_month,
                    'season_code': next_season_code,
                    'lag1': latest_qty,
                    'lag2': prev_qty 
                }])
                
                try:
                    pred = model.predict(X_next)[0]
                    predicted_demand = max(0, int(round(pred)))
                    confidence = 0.8
                except:
                    predicted_demand = int(p_sales['quantity_sold'].mean())
            else:
                # Not enough data for ML, use average
                predicted_demand = int(p_sales['quantity_sold'].mean())
                confidence = 0.4
        else:
            # Cold start / New Product
            predicted_demand = 5 # Default arbitrary
            confidence = 0.1

        # Risk Logic
        status = 'SAFE'
        reason = []
        restock_rec = 0
        
        if predicted_demand > current_stock:
            if current_stock == 0:
                 status = 'CRITICAL'
                 reason.append("Out of stock")
            else:
                 status = 'CRITICAL' if current_stock < (0.5 * predicted_demand) else 'WARNING'
                 reason.append(f"Stock ({current_stock}) < Predicted Demand ({predicted_demand})")
            
            restock_rec = predicted_demand - current_stock + int(predicted_demand * 0.2) # +20% buffer
            
        elif current_stock < (predicted_demand * 1.2):
            status = 'WARNING'
            reason.append("Stock is close to predicted demand")
            restock_rec = int(predicted_demand * 1.2) - current_stock
            
        # Seasonality check for reason
        if next_season == 'Festival' or next_season == 'Summer':
             reason.append(f"Approaching {next_season} season")

        results.append({
            'product_sku': str(sku),
            'product_name': str(product_name),
            'current_stock': int(current_stock),
            'predicted_demand': int(predicted_demand),
            'confidence_level': float(confidence),
            'risk_status': str(status),
            'next_restock_recommendation': int(max(0, restock_rec)),
            'reason': str("; ".join(reason) if reason else "Sufficient stock"),
            'prediction_date': datetime.now().isoformat()
        })
        
    return results

if __name__ == '__main__':
    try:
        # Read JSON from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)
            
        data = json.loads(input_data)
        products = data.get('products', [])
        sales = data.get('sales', [])
        
        predictions = process_data(products, sales)
        
        print(json.dumps(predictions))
        
    except Exception as e:
        # Print error to stderr so parent process knows, but output empty json array to stdout or error obj
        sys.stderr.write(str(e))
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
