# scraped-galaxies
High scraping tool for twingalaxies.com

Usage:
```node getscores.js <URL>```

If no URL is provided, it will default to pulling high scores for Hydro Thunder.

Standard output is a JSON file called scores.json. It will contain usernames, "initials", and scores for each level and type of performance listed on the games page.
Initials are generated based on username and are a best guess at 3 letters that represent the user.

If Hydro Thunder is detected, it will also output a csv file compatible with Tech Tangents' [HydroThunder-TimeTool](https://github.com/AkBKukU/HydroThunder-TimeTool).
