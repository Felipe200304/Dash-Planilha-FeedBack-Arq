const FRANCHISE_MAP = {
  JOI: "Joinville",
  TST: "Teste Franchise",
  FLN: "Florianopolis",
  BAL: "Balneario Camboriu",
  MGM: "Mogi Mirim",
  ITU: "Itu",
  QGB: "Limeira",
  CTC: "SAC Central",
  MPA: "Pouso Alegre",
  VCP: "Campinas",
  GRU: "Guarulhos",
  OSC: "Osasco SP01",
  SCT: "Sao Caetano SP02",
  STA: "Santos",
  JDI: "Jundiai",
  SOD: "Sorocaba",
  UID: "Uberlandia",
  SJC: "Sao Jose dos Campos",
  RBP: "Ribeirao Preto",
  RJB: "Rio de Janeiro Botafogo",
}

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
    const headerLine = lines[0];
    // Simple CSV parse for header
    const header = headerLine.split(',').map(h => h.replace(/"/g, "").trim().toLowerCase())
    
    let franchiseIdx = -1
    const aliases = ["franquia", "franchise", "franchisecode"]
    
    for (let i = 0; i < header.length; i++) {
      if (aliases.includes(header[i])) {
        franchiseIdx = i
        break
      }
    }
    
    if (franchiseIdx === -1) {
        console.log('Cant find franchise column', header)
        return
    }

    const codes = new Set()
    for (let i = 1; i < lines.length; i++) {
         const line = lines[i]
         // Handle quoted commas properly? For now simple split might do if codes don't have commas
         // But let's be safer.
         const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
         // Actually let's just use split if we assume codes are simple
         const cols = line.split(',')
         const code = (cols[franchiseIdx] || "").replace(/"/g, "").trim()
         if (code) codes.add(code)
    }

    console.log("Unique codes found:", Array.from(codes))
    console.log("Checking against map:")
    for (const code of codes) {
        if (!FRANCHISE_MAP[code]) {
            console.log(`MISSING MAPPING FOR: '${code}'`)
        } else {
             // console.log(`Mapped '${code}' -> '${FRANCHISE_MAP[code]}'`)
        }
    }

  } catch (e) {
    console.error(e)
  }
}

check()
