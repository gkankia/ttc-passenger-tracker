import requests
from bs4 import BeautifulSoup

URL = "https://ttc.com.ge"

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

response = requests.get(URL, headers=headers, timeout=20)
soup = BeautifulSoup(response.text, "html.parser")

# Save the HTML
with open("debug_page.html", "w", encoding="utf-8") as f:
    f.write(soup.prettify())

print("Page saved to debug_page.html")

# Look for all span elements
print("\nAll span elements with classes:")
for span in soup.find_all("span", class_=True):
    if span.text.strip():
        print(f"Classes: {span.get('class')} | Text: {span.text.strip()[:80]}")

# Look specifically for footer elements
print("\n\nFooter-related elements:")
for el in soup.find_all(class_=lambda x: x and 'footer' in ' '.join(x).lower()):
    print(f"Tag: {el.name} | Classes: {el.get('class')} | Text: {el.text.strip()[:80]}")