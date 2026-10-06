/* A frozen copy of menu-prices.csv and public-data.json as they stood on 6 October 2026,
   when the five test quotes in selftest.js were worked out by hand. The self-test uses this copy
   so it checks the RULES, whatever the real price list says today. Do not edit by hand. */
window.SELFTEST_DATA = {
 "frozenOn": "2026-10-06",
 "csv": "section,item,tier,min_guests,max_guests,unit,price_gbp,minimum_charge_gbp,notes\nmenu,Classic,Classic,1,49,per head,34.00,,2 courses\nmenu,Classic,Classic,50,99,per head,31.00,,2 courses\nmenu,Classic,Classic,100,199,per head,28.50,,2 courses\nmenu,Classic,Classic,200,,per head,26.50,,2 courses\nmenu,Signature,Signature,1,49,per head,52.00,,3 courses\nmenu,Signature,Signature,50,99,per head,48.00,,3 courses\nmenu,Signature,Signature,100,199,per head,44.50,,3 courses\nmenu,Signature,Signature,200,,per head,41.50,,3 courses\nmenu,Prestige,Prestige,1,49,per head,82.00,,4 courses + amuse-bouche; tasting included\nmenu,Prestige,Prestige,50,99,per head,76.00,,4 courses + amuse-bouche; tasting included\nmenu,Prestige,Prestige,100,199,per head,71.00,,4 courses + amuse-bouche; tasting included\nmenu,Prestige,Prestige,200,,per head,67.00,,4 courses + amuse-bouche; tasting included\nfood_cost,Classic food cost,Classic,,,per head,11.50,,Ingredients and consumables; internal only\nfood_cost,Signature food cost,Signature,,,per head,17.75,,Ingredients and consumables; internal only\nfood_cost,Prestige food cost,Prestige,,,per head,29.00,,Ingredients and consumables; internal only\ncanapes,Canapés (3 per guest),,,,per head,7.50,150.00,Chef's selection\ncanapes,Canapés (5 per guest),,,,per head,11.50,200.00,Chef's selection\ncanapes,Premium canapés (5 per guest),,,,per head,16.00,300.00,Includes oysters and local crab\ndrinks,Arrival drink (Prosecco or soft),,,,per head,6.50,,One glass per guest\ndrinks,Wine with meal (half bottle),,,,per head,14.00,,House red/white/rosé\ndrinks,Toast drink (Prosecco),,,,per head,5.50,,One glass per guest\ndrinks,Soft drinks package,,,,per head,4.50,,Juices and sparkling water through the event\ndrinks,Corkage (client's own wine),,,,per bottle,8.00,,Includes glassware and service\nequipment,Round table (seats 10),,,,per item,14.00,70.00,\nequipment,Trestle table (6ft),,,,per item,9.00,45.00,\nequipment,Banqueting chair,,,,per item,3.50,70.00,\nequipment,Chair cover and sash,,,,per item,3.00,60.00,\nequipment,Linen tablecloth,,,,per item,8.50,40.00,\nequipment,Linen napkin,,,,per item,0.85,25.00,\nequipment,Crockery and cutlery set,,,,per head,3.25,60.00,Per place setting\nequipment,Glassware set (3 glasses),,,,per head,1.80,40.00,Per place setting\nequipment,Mobile bar unit,,,,per event,180.00,180.00,\nequipment,Field kitchen (marquee events),,,,per event,450.00,450.00,Ovens and hot cupboards\nequipment,Patio heater,,,,per item,45.00,90.00,Includes gas\ndietary,Dietary surcharge,,,,per head,4.00,,Per guest needing a separate dish (e.g. vegan; gluten-free; allergen-safe)\ntravel,St Helier,,,,per event,45.00,,Travel and setup\ntravel,St Saviour,,,,per event,35.00,,Travel and setup; home parish\ntravel,St Clement,,,,per event,50.00,,Travel and setup\ntravel,Grouville,,,,per event,55.00,,Travel and setup\ntravel,St Martin,,,,per event,60.00,,Travel and setup\ntravel,Trinity,,,,per event,60.00,,Travel and setup\ntravel,St John,,,,per event,70.00,,Travel and setup\ntravel,St Lawrence,,,,per event,60.00,,Travel and setup\ntravel,St Peter,,,,per event,70.00,,Travel and setup\ntravel,St Mary,,,,per event,75.00,,Travel and setup\ntravel,St Brelade,,,,per event,75.00,,Travel and setup\ntravel,St Ouen,,,,per event,85.00,,Travel and setup\n",
 "json": {
  "_readme": "Jersey public figures for Lovely Bites pricing. IMPORTANT: every 'status' below is 'NOT_CONFIRMED_FROM_PAGE'. gov.je and jerseylaw.je were blocked from the machine that built this file, so no official page could be opened and read. The values come from web-search summaries that named the gov.je pages listed as source_url. Check each one against its source_url before using it for a real quote. Nothing here was guessed or filled in from memory.",
  "retrieved_on": "2026-10-06",
  "minimum_wage": {
   "status": "NOT_CONFIRMED_FROM_PAGE",
   "hourly_rate_gbp": 13.59,
   "applies_from": "2026-04-01",
   "trainee_year_1_hourly_rate_gbp": 10.5,
   "caveat": "The search summary of the gov.je announcement called this a PROPOSED rate. A jerseylaw.je page titled 'Employment (Minimum Wage) (Jersey) Amendment Order 2026' (RO-012-2026) also exists, which suggests it was enacted, but its contents could not be read. Confirm the rate and the start date on the official minimum wage page.",
   "source_url": "https://www.gov.je/Working/EmploymentRelations/Pages/MinimumWage.aspx",
   "other_urls_seen": [
    "https://www.gov.je/News/2025/pages/2026proposedminimumwageannounced.aspx",
    "https://www.jerseylaw.je/laws/enacted/Pages/RO-012-2026.aspx"
   ],
   "date_checked": "2026-10-06"
  },
  "employers_social_security": {
   "status": "NOT_CONFIRMED_FROM_PAGE",
   "year": 2026,
   "class_1_secondary_rate_up_to_standard_earnings_limit": 0.065,
   "class_1_secondary_rate_between_sel_and_uel": 0.025,
   "standard_earnings_limit_monthly_gbp": 6062,
   "upper_earnings_limit_monthly_gbp": 27632,
   "minimum_earnings_threshold_monthly_gbp": 618,
   "caveat": "Reported for 2026 by a search summary. Weekly figures were not given, and the figures could not be checked against the page. Staff on or near minimum wage would normally sit below the standard earnings limit, so 6.5% would apply, but confirm that on the page.",
   "source_url": "https://www.gov.je/Working/Contributions/Employers/pages/tables.aspx",
   "other_urls_seen": [
    "https://www.gov.je/Working/Contributions/Employers/pages/scheduleguide.aspx"
   ],
   "date_checked": "2026-10-06"
  },
  "gst": {
   "status": "NOT_CONFIRMED_FROM_PAGE",
   "standard_rate": 0.05,
   "caveat": "Reported as 5% on most goods and services supplied in Jersey. Not checked whether catering has any special treatment, and not checked whether Lovely Bites is registered (registration threshold was reported as £300,000 turnover, also unchecked).",
   "source_url": "https://www.gov.je/TaxesMoney/GST/GSTCustomers/pages/gstquickguide.aspx",
   "other_urls_seen": [
    "https://www.gov.je/TaxesMoney/GST/Businesses/Introduction/pages/whattaxed.aspx"
   ],
   "date_checked": "2026-10-06"
  },
  "bank_holidays": {
   "2026": [
    {
     "date": "2026-01-01",
     "name": "New Year's Day"
    },
    {
     "date": "2026-04-03",
     "name": "Good Friday"
    },
    {
     "date": "2026-04-06",
     "name": "Easter Monday"
    },
    {
     "date": "2026-05-04",
     "name": "Early May bank holiday"
    },
    {
     "date": "2026-05-09",
     "name": "Liberation Day",
     "note": "Falls on a Saturday. Whether a weekday substitute applies is NOT CONFIRMED."
    },
    {
     "date": "2026-05-25",
     "name": "Spring bank holiday"
    },
    {
     "date": "2026-08-31",
     "name": "Summer bank holiday"
    },
    {
     "date": "2026-12-25",
     "name": "Christmas Day"
    },
    {
     "date": "2026-12-28",
     "name": "Boxing Day (substitute day)"
    }
   ],
   "2027": [
    {
     "date": "2027-01-01",
     "name": "New Year's Day"
    },
    {
     "date": "2027-03-26",
     "name": "Good Friday"
    },
    {
     "date": "2027-03-29",
     "name": "Easter Monday"
    },
    {
     "date": "2027-05-03",
     "name": "Early May bank holiday"
    },
    {
     "date": "2027-05-09",
     "name": "Liberation Day",
     "note": "Falls on a Sunday. Whether a weekday substitute applies is NOT CONFIRMED."
    },
    {
     "date": "2027-05-31",
     "name": "Spring bank holiday"
    },
    {
     "date": "2027-08-30",
     "name": "Summer bank holiday"
    },
    {
     "date": "2027-12-27",
     "name": "Christmas Day (substitute day)"
    },
    {
     "date": "2027-12-28",
     "name": "Boxing Day (substitute day)"
    }
   ],
   "status": "NOT_CONFIRMED_FROM_PAGE",
   "caveat": "Dates as reported by a search summary of the gov.je page. They could not be read on the page itself. The substitute-day dates (Liberation Day in 2026 and 2027, Christmas and Boxing Day) are the ones most worth checking, because the summary's note said weekend holidays move to a weekday and that rule was not checked against the law. 2027 dates may also be marked provisional on the page.",
   "source_url": "https://www.gov.je/Leisure/Events/WhatsOn/pages/bankholidaydates.aspx",
   "other_urls_seen": [
    "https://www.jerseylaw.je/laws/current/Pages/15.560.aspx"
   ],
   "date_checked": "2026-10-06"
  }
 }
};
