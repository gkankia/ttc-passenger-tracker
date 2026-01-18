from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from datetime import datetime
import json
import os
import time
import sys

URL = "https://ttc.com.ge"
DATA_FOLDER = "data"
DATA_FILE = os.path.join(DATA_FOLDER, "ttc_passengers.json")

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

def load_data():
    """Load existing JSON data or return empty list."""
    os.makedirs(DATA_FOLDER, exist_ok=True)
    
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_data(data):
    """Save data to JSON file."""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def date_exists(data, date_str):
    """Check if date already exists in data."""
    return any(entry["date"] == date_str for entry in data)

def main():
    # Load existing data
    all_data = load_data()

    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    # Initialize the driver
    driver = None
    try:
        # Check if running in GitHub Actions
        if os.getenv('GITHUB_ACTIONS'):
            # Use system chromium-chromedriver
            service = Service('/usr/bin/chromedriver')
            chrome_options.binary_location = '/usr/bin/chromium-browser'
            driver = webdriver.Chrome(service=service, options=chrome_options)
        else:
            # Use webdriver-manager for local development
            from webdriver_manager.chrome import ChromeDriverManager
            driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        
        driver.get(URL)
        
        # Wait for the page to load
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
        if date_exists(all_data, formatted_date):
            print(f"Data for {formatted_date} already exists. Skipping.")
            driver.quit()
            return
        
        # Extract passenger numbers
        traffic_items = driver.find_elements(By.CLASS_NAME, "ttc-trafic-item")
        print(f"Found {len(traffic_items)} traffic items")
        
        transport_data = {}
        for item in traffic_items:
            try:
                # Get the transport mode from classes
                classes = item.get_attribute("class").split()
                mode = classes[-1] if classes else None
                
                # Get the number
                num_element = item.find_element(By.CLASS_NAME, "ttc-trafic-num")
                num_text = num_element.text.strip().replace(',', '').replace(' ', '')
                
                if num_text.isdigit() and int(num_text) > 0:
                    transport_data[mode] = int(num_text)
                else:
                    transport_data[mode] = None
                
                print(f"  {mode}: {transport_data.get(mode)}")
            except Exception as e:
                print(f"Error extracting data from item: {e}")
        
        driver.quit()
        
        # Check if we got any valid data
        if not any(transport_data.values()):
            print("Warning: All values are 0 or None. Page might not have loaded properly.")
            return
        
        # Create new entry
        new_entry = {
            "date": formatted_date,
            "weekday": weekday,
            "bus": transport_data.get("bus"),
            "metro": transport_data.get("metro"),
            "minibus": transport_data.get("minibus"),
            "cable": transport_data.get("cable")
        }
        
        # Add to data and save
        all_data.append(new_entry)
        save_data(all_data)
        
        print(f"\nSaved: {new_entry}")
        print(f"Total records: {len(all_data)}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        if driver:
            driver.quit()
        sys.exit(1)

if __name__ == "__main__":
    main()