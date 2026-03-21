#!/usr/bin/env node

const CompAnalyzer = require('./comp-analyzer');

const analyzer = new CompAnalyzer();

const testTitles = [
  "MICHAEL JORDAN 1997-98 Topps Finest Showstoppers #271 WITH COATING",
  "Michael Jordan 1997-98 Topps Finest #39 Bronze Finishers No Coating Bulls HOF",
  "1993-94 TOPPS FINEST SET YOU PICK MICHAEL JORDAN REGGIE MILLER PIPPEN 1-220 RCs",
  "1996-97 Finest #50 Michael Jordan Chicago Bulls P.O4F"
];

console.log('Testing comp title cleaning:\n');

testTitles.forEach(title => {
  const cleaned = analyzer.cleanTitleForComps(title);
  console.log(`Original: ${title}`);
  console.log(`Cleaned:  ${cleaned}`);
  console.log(`Search:   ${cleaned} PSA 10\n`);
});
