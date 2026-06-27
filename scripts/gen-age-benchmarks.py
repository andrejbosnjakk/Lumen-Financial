# Pre-processes the 1M synthetic Dutch transaction CSV into age-group spending benchmarks.
# Output: lumen/public/data/age-benchmarks.json
# Usage: python scripts/gen-age-benchmarks.py <path-to-csv>
import csv
import json
import sys
from collections import defaultdict

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else "C:/Users/andre/Downloads/synthetic_1000000.csv"
OUT_PATH = "C:/Users/andre/OneDrive/Desktop/DelftHack/lumen/public/data/age-benchmarks.json"

# Map MCC description → our 13-category taxonomy
CATEGORY_MAP = {
    # Groceries
    "Grocery Stores, Supermarkets": "Groceries",
    "Misc. Food Stores – Convenience Stores and Specialty Markets": "Groceries",
    "Misc. Food Stores \x96 Convenience Stores and Specialty Markets": "Groceries",
    "Bakeries": "Groceries",
    "Candy, Nut, and Confectionery Stores": "Groceries",
    "Dairy Products Stores": "Groceries",
    "Meat Provisioners \x96 Freezer and Locker": "Groceries",
    "Wholesale Clubs": "Groceries",
    "Package Stores \x96 Beer, Wine, and Liquor": "Groceries",

    # Restaurants & Food
    "Eating places and Restaurants": "Restaurants & Food",
    "Fast Food Restaurants": "Restaurants & Food",
    "Caterers": "Restaurants & Food",
    "Drinking Places (Alcoholic Beverages), Bars, Taverns, Cocktail lounges, Nightclubs and Discotheques": "Restaurants & Food",

    # Transport
    "Taxicabs and Limousines": "Transport",
    "Service Stations ( with or without ancillary services)": "Transport",
    "Automated Fuel Dispensers": "Transport",
    "Bus Lines, Including Charters, Tour Buses": "Transport",
    "Passenger Railways": "Transport",
    "Local/Suburban Commuter Passenger Transportation \x96 Railroads, Feries, Local Water Transportation.": "Transport",
    "Railroads": "Transport",
    "Automobile Parking Lots and Garages": "Transport",
    "Car Washes": "Transport",
    "Toll and Bridge Fees": "Transport",
    "Transportation Services, Not elsewhere classified)": "Transport",
    "Airlines": "Transport",
    "Airlines, Air Carriers ( not listed elsewhere)": "Transport",
    "Airports, Airport Terminals, Flying Fields": "Transport",
    "Travel Agencies and Tour Operations": "Transport",
    "Cruise and Steamship Lines": "Transport",
    "Car Rental": "Transport",
    "Car Rental Companies ( Not Listed Below)": "Transport",
    "Motor Freight Carriers, Moving and Storage Companies, Trucking \x96 Local/Long Distance, Delivery Services \x96 Local": "Transport",
    "AER LINGUS": "Transport",
    "AIR CANADA": "Transport",
    "AIR CHINA": "Transport",
    "AIR FRANCE": "Transport",
    "AIR NEW ZEALAND": "Transport",
    "AIR-INDIA": "Transport",
    "ALAMO RENT-A-CAR": "Transport",
    "AMERICAN AIRLINES": "Transport",
    "AUSTRAINLIAN AIRLINES": "Transport",
    "AUSTRIAN AIRLINES": "Transport",
    "AVIS RENT-A-CAR": "Transport",
    "BUDGET RENT-A-CAR": "Transport",
    "BRITISH AIRWAYS": "Transport",
    "CATHAY PACIFIC": "Transport",
    "DELTA": "Transport",
    "ENTERPRISE RENT-A-CAR": "Transport",
    "EUROP CAR": "Transport",
    "GARUDA (INDONESIA)": "Transport",
    "HERTZ RENT-A-CAR": "Transport",
    "IBERIA": "Transport",
    "KLM (ROYAL DUTCH AIRLINES)": "Transport",
    "LANCHILE": "Transport",
    "LUFTHANSA": "Transport",
    "QUANTAS": "Transport",
    "SABENA": "Transport",
    "SAS": "Transport",
    "SAUDIA ARABIAN AIRLINES": "Transport",
    "SINGAPORE AIRLINES": "Transport",
    "SWISSAIR": "Transport",
    "TACA INTERNATIONAL": "Transport",
    "TAP (PORTUGAL)": "Transport",
    "THY (TURKEY)": "Transport",
    "UNITED AIRLINES": "Transport",
    "WINDWARD ISLAND": "Transport",
    "AFFILIATED AUTO RENTAL": "Transport",

    # Entertainment
    "Motion Picture Theaters": "Entertainment",
    "Amusement Parks, Carnivals, Circuses, Fortune Tellers": "Entertainment",
    "Aquariums, Sea-aquariums, Dolphinariums": "Entertainment",
    "Betting (including Lottery Tickets, Casino Gaming Chips, Off-track Betting and Wagers at Race Tracks)": "Entertainment",
    "Government-Owned Lotteries": "Entertainment",
    "Billiard and Pool Establishments": "Entertainment",
    "Bowling Alleys": "Entertainment",
    "Bands, Orchestras, and Miscellaneous Entertainers (Not Elsewhere Classified)": "Entertainment",
    "Theatrical Producers (Except Motion Pictures), Ticket Agencies": "Entertainment",
    "Commercial Sports, Athletic Fields, Professional Sport Clubs, and Sport Promoters": "Entertainment",
    "Video Game Arcades/Establishments": "Entertainment",
    "Video Amusement Game Supplies": "Entertainment",
    "Video Tape Rental Stores": "Entertainment",
    "Hobby, Toy, and Game Shops": "Entertainment",
    "Book Stores": "Entertainment",
    "Books, Periodicals, and Newspapers": "Entertainment",
    "Music Stores, Musical Instruments, Piano Sheet Music": "Entertainment",
    "Record Shops": "Entertainment",
    "Tourist Attractions and Exhibits": "Entertainment",
    "Dance Halls, Studios and Schools": "Entertainment",

    # Utilities
    "Electric, Gas, Sanitary and Water Utilities": "Utilities",
    "Cable and other pay television (previously Cable Services)": "Utilities",
    "Fax services, Telecommunication Services": "Utilities",
    "Telecommunications Equipment including telephone sales": "Utilities",
    "Telegraph services": "Utilities",
    "Fuel \x96 Fuel Oil, Wood, Coal, Liquefied Petroleum": "Utilities",
    "Postal Services \x96 Government Only": "Utilities",

    # Subscriptions
    "Digital Goods: Applications (Excludes Games)": "Subscriptions",
    "Digital Goods: Games": "Subscriptions",
    "Digital Goods: Large Digital Goods Merchant": "Subscriptions",
    "Digital Goods: Media, Books, Movies, Music": "Subscriptions",
    "Direct Marketing \x96 Continuity/Subscription Merchant": "Subscriptions",
    "Computer Network Services": "Subscriptions",
    "Information Retrieval Services": "Subscriptions",
    "Computer Programming, Integrated Systems Design and Data Processing Services": "Subscriptions",

    # Healthcare
    "Drug Stores and Pharmacies": "Healthcare",
    "Drugs, Drug Proprietors, and Druggist\x92s Sundries": "Healthcare",
    "Doctors and Physicians (Not Elsewhere Classified)": "Healthcare",
    "Dentists and Orthodontists": "Healthcare",
    "Chiropractors": "Healthcare",
    "Hospitals": "Healthcare",
    "Medical Services and Health Practitioners (Not Elsewhere Classified)": "Healthcare",
    "Medical and Dental Laboratories": "Healthcare",
    "Medical, Dental Ophthalmic, Hospital Equipment and Supplies": "Healthcare",
    "Opticians, Opticians Goods and Eyeglasses": "Healthcare",
    "Optometrists and Ophthalmologists": "Healthcare",
    "Ambulance Services": "Healthcare",
    "Orthopedic Goods Prosthetic Devices": "Healthcare",
    "Nursing and Personal Care Facilities": "Healthcare",
    "Health and Beauty Shops": "Healthcare",
    "Barber and Beauty Shops": "Healthcare",

    # Fitness
    "Membership Clubs (Sports, Recreation, Athletic), Country Clubs, and Private Golf Courses": "Fitness",
    "Golf Courses \x96 Public": "Fitness",
    "Bicycle Shops \x96 Sales and Service": "Fitness",
    "Sporting Goods Stores": "Fitness",
    "Sports Apparel, Riding Apparel Stores": "Fitness",
    "Massage Parlors": "Fitness",
    "Swimming Pools \x96 Sales, Service, and Supplies": "Fitness",

    # Shopping
    "Department Stores": "Shopping",
    "Discount Stores": "Shopping",
    "Variety Stores": "Shopping",
    "Family Clothing Stores": "Shopping",
    "Men\x92s and Boy\x92s Clothing and Accessories Stores": "Shopping",
    "Men\x92s and Women\x92s Clothing Stores": "Shopping",
    "Women\x92s Accessory and Specialty Shops": "Shopping",
    "Women\x92s Ready-to-Wear Stores": "Shopping",
    "Children\x92s and Infant\x92s Wear Stores": "Shopping",
    "Shoe Stores": "Shopping",
    "Miscellaneous Apparel and Accessory Shops": "Shopping",
    "Electronic Sales": "Shopping",
    "Computers, Computer Peripheral Equipment, Software": "Shopping",
    "Computer Software Stores": "Shopping",
    "Camera and Photographic Supply Stores": "Shopping",
    "Furniture, Home Furnishings, and Equipment Stores, ExceptAppliances": "Shopping",
    "Household Appliance Stores": "Shopping",
    "Watch, Clock, Jewelry, and Silverware Stores": "Shopping",
    "Precious Stones and Metals, Watches and Jewelry": "Shopping",
    "Cosmetic Stores": "Shopping",
    "Pet Shops, Pet Foods, and Supplies Stores": "Shopping",
    "Direct Marketing \x96 Catalog Merchant": "Shopping",
    "Automotive Parts, Accessories Stores": "Shopping",
    "Hardware Stores": "Shopping",
    "Misc. General Merchandise": "Shopping",
    "Miscellaneous and Specialty Retail Stores": "Shopping",
    "Florists": "Shopping",
    "Art Dealers and Galleries": "Shopping",
    "Used Merchandise and Secondhand Stores": "Shopping",
    "Antique Shops": "Shopping",
    "Card Shops, Gift, Novelty, and Souvenir Shops": "Shopping",
    "Buying/Shopping Services, Clubs": "Shopping",
    "Duty Free Store": "Shopping",

    # Transfers (money movement)
    "Financial Institutions \x96 Manual Cash Disbursements": "Transfers",
    "Financial Institutions \x96 Merchandise and Services": "Transfers",
    "Money Orders \x96 Wire Transfer": "Transfers",
    "Non-Financial Institutions \x96 Foreign Currency, Money Orders (not wire transfer) and Travelers Cheques": "Transfers",
    "Security Brokers/Dealers": "Transfers",
}

VALID_AGE_GROUPS = {"18-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75+"}

def map_category(cat):
    mapped = CATEGORY_MAP.get(cat)
    if mapped:
        return mapped
    # Heuristic fallback for hotel chains → Other
    cat_upper = cat.upper()
    if any(x in cat_upper for x in ("HOTEL", "INN", "MOTEL", "RESORT", "LODG")):
        return "Other"
    if any(x in cat_upper for x in ("AIRLINE", "AIR ", "AIRWAYS", "AVIATION")):
        return "Transport"
    return "Other"

def main():
    print(f"Reading {CSV_PATH}...")
    # user_monthly[owner_id][age_group][category][month_key] = total_amount
    user_monthly = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(float))))

    total = 0
    skipped = 0
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            if total % 100000 == 0:
                print(f"  {total:,} rows processed...")

            age_group = row.get("age_group", "").strip()
            if age_group not in VALID_AGE_GROUPS:
                skipped += 1
                continue

            if row.get("state", "") != "COMPLETED":
                skipped += 1
                continue

            tx_type = row.get("type", "")
            if "REFUND" in tx_type or "TOPUP" in tx_type:
                skipped += 1
                continue

            try:
                amount = float(row.get("txn_amount_gbp", 0) or 0)
            except ValueError:
                skipped += 1
                continue

            if amount <= 0:
                skipped += 1
                continue

            cat_raw = row.get("category", "").strip()
            cat = map_category(cat_raw)

            owner = row.get("owner_id", "").strip()
            if not owner:
                skipped += 1
                continue

            date_str = row.get("completed_date", "")[:7]  # YYYY-MM
            if len(date_str) < 7:
                skipped += 1
                continue

            user_monthly[owner][age_group][cat][date_str] += amount

    print(f"Done reading. Total: {total:,}, skipped: {skipped:,}")
    print("Aggregating benchmarks...")

    # For each (age_group, category): collect per-user monthly averages
    age_cat_samples = defaultdict(lambda: defaultdict(list))

    for owner, age_data in user_monthly.items():
        for age_group, cat_data in age_data.items():
            for cat, month_data in cat_data.items():
                if month_data:
                    monthly_avg = sum(month_data.values()) / len(month_data)
                    age_cat_samples[age_group][cat].append(monthly_avg)

    result = {}
    for age_group in sorted(VALID_AGE_GROUPS):
        result[age_group] = {}
        cat_data = age_cat_samples.get(age_group, {})
        for cat, samples in sorted(cat_data.items()):
            if len(samples) >= 5:  # need at least 5 users per bucket
                avg = sum(samples) / len(samples)
                result[age_group][cat] = round(avg, 2)
        print(f"  {age_group}: {len(result[age_group])} categories, {sum(len(v) for v in age_cat_samples.get(age_group, {}).values()):,} user-category pairs")

    import os
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"\nWrote {OUT_PATH}")
    print("Sample (25-34):", json.dumps(result.get("25-34", {}), indent=2)[:400])

if __name__ == "__main__":
    main()
