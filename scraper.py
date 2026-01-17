from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime
import csv
import os
import time

URL = "https://ttc.com.ge"
DATA_FOLDER = "data"
DATA_FILE = os.path.join(DATA_FOLDER, "ttc_passengers.csv")

# Georgian month names to numbers (for fallback)
GEORGIAN_MONTHS = {
    'იანვარი': 1,
    'თებერვალი': 2,
    'მარტი': 3,
    'აპრილი': 4,
    'მაისი': 5,
    'ივნისი': 6,
    'ივლისი': 7,
    'აგვისტო': 8,
    'სექტემბერი': 9,
    'ოქტომბერი': 10,
    'ნოემბერი': 11,
    'დეკემბერი': 12
}

def parse_date(date_str):
    """Parse date - handles both DD.MM.YYYY and Georgian formats."""
    date_str = date_str.strip()
    
    # Try DD.MM.YYYY format first
    try:
        date_obj = datetime.strptime(date_str, "%d.%m.%Y")
        return date_obj
    except ValueError:
        pass
    
    # Try Georgian format: "30 დეკემბერი 2025"
    try:
        parts = date_str.split()
        if len(parts) == 3:
            day = int(parts[0])
            month_name = parts[1]
            year = int(parts[2])
            month = GEORGIAN_MONTHS.get(month_name)
            if month:
                return datetime(year, month, day)
    except:
        pass
    
    raise ValueError(f"Unable to parse date: {date_str}")

def get_weekday(date_obj):
    """Get weekday name from datetime object."""
    return date_obj.strftime("%A")

def format_date(date_obj):
    """Format datetime object as DD.MM.YYYY."""
    return date_obj.strftime("%d.%m.%Y")

def ensure_csv():
    """Create data folder and CSV with header if it doesn't exist."""
    os.makedirs(DATA_FOLDER, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["date", "weekday", "bus", "metro", "minibus", "cable"])
        print(f"Created new CSV file at {DATA_FILE}")

def date_exists(date_str):
    """Check if date already exists in CSV."""
    if not os.path.exists(DATA_FILE):
        return False
    
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["date"] == date_str:
                return True
    return False

def main():
    ensure_csv()

    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in background
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    # Initialize the driver
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        driver.get(URL)
        
        # Wait for the page to load (wait for traffic numbers to appear)
        wait = WebDriverWait(driver, 20)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "ttc-trafic-num")))
        
        # Give extra time for numbers to update from 0
        time.sleep(3)
        
        # Try to find date in footer
        date_str = None
        try:
            date_element = driver.find_element(By.CSS_SELECTOR, "h3.footer-title span.footer-title-date.mrglovani")
            date_str = date_element.text.strip()
        except:
            # If not found, try alternative selectors
            try:
                date_element = driver.find_element(By.CSS_SELECTOR, ".footer-title-date")
                date_str = date_element.text.strip()
            except:
                print("Could not find date element. Using current date.")
                date_obj = datetime.now()
                formatted_date = format_date(date_obj)
                weekday = get_weekday(date_obj)
        
        if date_str:
            # Parse date (handles both formats)
            try:
                date_obj = parse_date(date_str)
                formatted_date = format_date(date_obj)
                weekday = get_weekday(date_obj)
                print(f"Found date: {date_str} -> {formatted_date} ({weekday})")
            except ValueError as e:
                print(f"Error parsing date: {e}")
                driver.quit()
                return
        
        # Check for duplicates
        if date_exists(formatted_date):
            print(f"Data for {formatted_date} already exists. Skipping.")
            driver.quit()
            return
        
        # Extract passenger numbers
        traffic_items = driver.find_elements(By.CLASS_NAME, "ttc-trafic-item")
        print(f"Found {len(traffic_items)} traffic items")
        
        data = {}
        for item in traffic_items:
            try:
                # Get the transport mode from classes
                classes = item.get_attribute("class").split()
                mode = classes[-1] if classes else None
                
                # Get the number
                num_element = item.find_element(By.CLASS_NAME, "ttc-trafic-num")
                num_text = num_element.text.strip().replace(',', '').replace(' ', '')
                
                if num_text.isdigit() and int(num_text) > 0:
                    data[mode] = int(num_text)
                else:
                    data[mode] = None
                
                print(f"  {mode}: {data.get(mode)}")
            except Exception as e:
                print(f"Error extracting data from item: {e}")
        
        driver.quit()
        
        # Check if we got any valid data
        if not any(data.values()):
            print("Warning: All values are 0 or None. Page might not have loaded properly.")
            return
        
        # Append to CSV
        try:
            with open(DATA_FILE, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow([
                    formatted_date,
                    weekday,
                    data.get("bus"),
                    data.get("metro"),
                    data.get("minibus"),
                    data.get("cable")
                ])
        except Exception as e:
            print(f"Error writing to CSV: {e}")
            return
        
        print("\nSaved:", {"date": formatted_date, "weekday": weekday, **data})
        
    except Exception as e:
        print(f"Error: {e}")
        if 'driver' in locals():
            driver.quit()

if __name__ == "__main__":
    main()