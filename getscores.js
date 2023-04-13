const
  fs = require('fs'),
  url = require('url');

const
  OUTPUT_NAME = "scores",
  BASE_URL = url.parse(process.argv[2] || "https://www.twingalaxies.com/game/hydro-thunder/arcade/");

function getTitle(text) {
  let
    token = 'class="player-coun"',
    beforeTitle = text.indexOf(token),
    titleStart = text.indexOf("<b>", beforeTitle),
    titleEnd = text.indexOf("</b>", titleStart+3);

  return text.substring(titleStart+3, titleEnd-1).split(" [");
}

function getScores(text) {
  let
    rankBlockToken = "ranker-info flex-1",
    usernameToken = 'target="_blank">',
    scoreToken = "<h3>",
    cursor = text.indexOf(rankBlockToken),
    scores = [];

  while (cursor > -1) {
    cursor = text.indexOf(usernameToken, cursor)+usernameToken.length;
    let username = text.substring(cursor, text.indexOf("</", cursor)).trim();
    
    cursor = text.indexOf(scoreToken, cursor)+scoreToken.length;
    let score = text.substring(cursor, text.indexOf("</", cursor)).trim();

    if (score.match(/<a href="\/showthread.php/)) {
      //the text of the score is linked to a discussion thread
      score = score.substring(score.indexOf(">")+1)
    }

    scores.push({username, initials: getInitials(username), score});

    cursor = text.indexOf(rankBlockToken, cursor + rankBlockToken.length+1);
  }
  return scores;
}

function getInitials(username) {
  let parts = username.split(/s+/);

  if (parts.length>1) {
    username = parts.map(p=>p[0]).join("")
  }

  return username.substring(0,3).toUpperCase();
}

function makeHydroCSV(scores) {
  let
    boats = [
      "Cutthroat", "Tidal Blade", "Thresher", "Blowfish", "Midway",
      "Banshee", "Miss Behave", "Damn the Torpedoes", "Razorback"
    ],
    output = ["t,Initials,Boat,Timestamp"];
  
  Object.keys(scores["Fastest Race"]).forEach(track => {
    scores["Fastest Race"][track].forEach((score, i) => {
      if (i > 9) {return;} //only save to 10 scores

      output.push(`${track},${score.initials},${boats[(boats.length*Math.random())>>0]},${score.score}`)
    })
  })

  fs.writeFileSync(OUTPUT_NAME+".csv", output.join("\n"));
}


console.log("Getting number of summary pages...")
fetch(BASE_URL.href)
  .then(response => {
    if (!response.ok) { throw new Error(response.status) }
    return response.text()
  })
  .then(text => {
    let gameid = text.match(/gameid=(\d+)/)[1];
    let platformid = text.match(/platformid=(\d+)/)[1];
    let pageNumbers = text.match(/;page=(\d+)"/g).map(p=>p.slice(6,-1));
    
    //need to deduplicate the page numbers
    pageNumbers = Array.from(new Set(pageNumbers));

    console.log("Found " + pageNumbers.length + " pages of summary ranks. Getting full rankings from each page...")

    //request each of the game's pages and dump the text
    return Promise.all(pageNumbers.map(p =>
      fetch(`${BASE_URL.protocol}//${BASE_URL.host}/game_detail.php?gameid=${gameid}&platformid=${platformid}&page=${p}`)
        .then(response=>response.text())
    ))
  })
  .then(summaryPages => {
    //from each summary page, get the links to the full high score page for each category
    let requests = summaryPages.reduce((requests, text) => {
      text.split("\n").forEach(line => {
        if (line.indexOf("Show More Performances") >= 0) {
          let href = line.substring(line.indexOf("https"), line.indexOf("/page"));
          requests.push(fetch(href).then(response => response.text()));
        }
      })
      return requests;
    }, []);

    console.log("Found " + requests.length + " individual high score pages. Reading...")
    return Promise.all(requests);
  })
  .then(scorePages => {
    let scores = {};
    scorePages.forEach(page => {
      [map, category] = getTitle(page);
      console.log(map, category);

      scores[category] = scores[category] || {};
      scores[category][map] = getScores(page);
    });

    fs.writeFileSync(OUTPUT_NAME+".json", JSON.stringify(scores, " ", 2));
    if (BASE_URL.href.indexOf("hydro-thunder")) {
      makeHydroCSV(scores)
    }
  })
  .catch(console.error)