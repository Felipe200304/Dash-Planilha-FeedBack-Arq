import { FRANCHISE_MAP } from "../lib/franchises"

const SPREADSHEET_ID = "1Ct6G_xxnNU9niOkTIeakVJCTwLdGi9avpmked3E-_aw"

async function check() {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0`
  console.log(`Fetching from ${url}`)
  try {
    const res = await fetch(url)
    const text = await res.text()
    const lines = text.split("\n")
    if (lines.length < 2) {
      console.log('No data found')
      return;
    }
    const header = lines[0].split(',')
    let franchiseIdx = -1
    for (let i = 0; i < header.length; i++) {
      const h = header[i].replace(/"/g, "").trim().toLowerCase()
      if (['franquia', 'franchise', 'franchisecode'].includes(h)) {
        franchiseIdx = i
        break
      }
    }
    
    if (franchiseIdx === -1) {
        console.log('Cant find franchise column', header)
        return
    }

    const codes = new Set<string>()
    for (let i = 1; i < lines.length; i++) {
         const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // simple regex split
         const code = (cols[franchiseIdx] || "").replace(/"/g, "").trim()
         if (code) codes.add(code)
    }

    console.log("Unique codes found:", Array.from(codes))
    console.log("Checking against map:")
    for (const code of codes) {
        if (!FRANCHISE_MAP[code]) {
            console.log(`MISSING MAPPING FOR: '${code}'`)
        } else {
             console.log(`Mapped '${code}' -> '${FRANCHISE_MAP[code]}'`)
        }
    }

  } catch (e) {
    console.error(e)
  }
}

check()
