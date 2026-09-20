// Cloudflare PoPs (network.cloudflare.com) named for the airport whose
// IATA code they share - any country, not only Canada - and, where the
// source data has it, that airport's physical runways.
//
// `POP_IDENTITY` (which PoPs exist, and their id/IATA/ICAO/city/country) is
// hand curated - Cloudflare doesn't publish that list as a file, and it
// changes rarely enough that maintaining it by hand is fine. The IATA/ICAO
// pairing for each entry was cross-referenced against OurAirports's own
// `airports.csv` rather than typed from memory, since a wrong code here
// silently produces either no runway data or another airport's. Runway
// geometry is the opposite: it's exactly what OurAirports's `runways.csv`
// (davidmegginson.github.io/ourairports-data/runways.csv) already
// publishes, so `scripts/fetch-runways.ts` derives it mechanically via
// `parse_runways_csv` + `select_pop_runways` below (both pure, both tested
// here, and neither cares what country an ICAO code belongs to) and writes
// the committed result to `runway-data.generated.ts`. Re-run
// `npm run fetch-runways` to refresh it or pick up a newly-added PoP, from
// any country - no per-airport manual lookup.
//
// `runways` stays `undefined` rather than `[]` when the generated data has
// nothing for a PoP's ICAO code, so RunwayDiagram can tell "no data" apart
// from "genuinely no runways".
//
// Each end is stored as its own real lat/lon (`le_latitude_deg`/
// `le_longitude_deg` and the `he_` pair in the source CSV), not a heading
// number: an airport's runways sit at their own real offsets from one
// another - parallel runways are laterally separated, a crosswind runway
// may not cross them at all - and a single shared heading-plus-length model
// drew every runway through the same center point, which is a different,
// wrong airport. runway-diagram-layout.ts projects every end's lat/lon into
// one shared local frame so the drawing keeps that true relative geometry.

import { RUNWAYS_BY_ICAO } from "./runway-data.generated.js";

export interface RunwayEnd {
  ident: string;
  lat: number;
  lon: number;
}

export interface Runway {
  designator: string;
  low_end: RunwayEnd;
  high_end: RunwayEnd;
  length_ft: number;
  width_ft: number;
  closed: boolean;
}

export interface PopAirport {
  id: string;
  iata: string;
  icao: string;
  city: string;
  /** ISO 3166-1 alpha-2, e.g. "CA". */
  country: string;
  runways?: Runway[];
}

export const POP_IDENTITY: readonly Omit<PopAirport, "runways">[] = [
  { id: "yul", iata: "YUL", icao: "CYUL", city: "Montréal", country: "CA" },
  { id: "yyz", iata: "YYZ", icao: "CYYZ", city: "Toronto", country: "CA" },
  { id: "yvr", iata: "YVR", icao: "CYVR", city: "Vancouver", country: "CA" },
  { id: "yyc", iata: "YYC", icao: "CYYC", city: "Calgary", country: "CA" },
  { id: "ywg", iata: "YWG", icao: "CYWG", city: "Winnipeg", country: "CA" },
  { id: "yhz", iata: "YHZ", icao: "CYHZ", city: "Halifax", country: "CA" },
  { id: "yxe", iata: "YXE", icao: "CYXE", city: "Saskatoon", country: "CA" },
  { id: "aae", iata: "AAE", icao: "DABB", city: "Annaba", country: "DZ" },
  { id: "abj", iata: "ABJ", icao: "DIAP", city: "Abidjan", country: "CI" },
  { id: "abq", iata: "ABQ", icao: "KABQ", city: "Albuquerque", country: "US" },
  { id: "acc", iata: "ACC", icao: "DGAA", city: "Accra", country: "GH" },
  { id: "acx", iata: "ACX", icao: "ZUYI", city: "Xingyi", country: "CN" },
  { id: "adb", iata: "ADB", icao: "LTBJ", city: "Gaziemir", country: "TR" },
  { id: "add", iata: "ADD", icao: "HAAB", city: "Addis Ababa", country: "ET" },
  { id: "adl", iata: "ADL", icao: "YPAD", city: "Adelaide", country: "AU" },
  { id: "aip", iata: "AIP", icao: "VIAX", city: "Adampur", country: "IN" },
  { id: "akl", iata: "AKL", icao: "NZAA", city: "Auckland", country: "NZ" },
  { id: "akx", iata: "AKX", icao: "UATT", city: "Aktobe", country: "KZ" },
  { id: "ala", iata: "ALA", icao: "UAAA", city: "Almaty", country: "KZ" },
  { id: "alg", iata: "ALG", icao: "DAAG", city: "Algiers", country: "DZ" },
  { id: "amd", iata: "AMD", icao: "VAAH", city: "Ahmedabad", country: "IN" },
  { id: "amm", iata: "AMM", icao: "OJAI", city: "Amman", country: "JO" },
  { id: "ams", iata: "AMS", icao: "EHAM", city: "Amsterdam", country: "NL" },
  { id: "anc", iata: "ANC", icao: "PANC", city: "Anchorage", country: "US" },
  { id: "ari", iata: "ARI", icao: "SCAR", city: "Arica", country: "CL" },
  { id: "arn", iata: "ARN", icao: "ESSA", city: "Stockholm", country: "SE" },
  { id: "aru", iata: "ARU", icao: "SBAU", city: "Araçatuba", country: "BR" },
  { id: "ask", iata: "ASK", icao: "DIYO", city: "Yamoussoukro", country: "CI" },
  { id: "asu", iata: "ASU", icao: "SGAS", city: "Asunción", country: "PY" },
  { id: "ath", iata: "ATH", icao: "LGAV", city: "Spata-Artemida", country: "GR" },
  { id: "atl", iata: "ATL", icao: "KATL", city: "Atlanta", country: "US" },
  { id: "aus", iata: "AUS", icao: "KAUS", city: "Austin", country: "US" },
  { id: "ava", iata: "AVA", icao: "ZUAS", city: "Anshun (Xixiu)", country: "CN" },
  { id: "bah", iata: "BAH", icao: "OBBI", city: "Manama", country: "BH" },
  { id: "baq", iata: "BAQ", icao: "SKBQ", city: "Barranquilla", country: "CO" },
  { id: "bbi", iata: "BBI", icao: "VEBS", city: "Bhubaneswar", country: "IN" },
  { id: "bcn", iata: "BCN", icao: "LEBL", city: "Barcelona", country: "ES" },
  { id: "beg", iata: "BEG", icao: "LYBE", city: "Belgrade", country: "RS" },
  { id: "bel", iata: "BEL", icao: "SBBE", city: "Belém", country: "BR" },
  { id: "ber", iata: "BER", icao: "EDDB", city: "Berlin", country: "DE" },
  { id: "bey", iata: "BEY", icao: "OLBA", city: "Beirut", country: "LB" },
  { id: "bgi", iata: "BGI", icao: "TBPB", city: "Bridgetown", country: "BB" },
  { id: "bgr", iata: "BGR", icao: "KBGR", city: "Bangor", country: "US" },
  { id: "bgw", iata: "BGW", icao: "ORBI", city: "Baghdad", country: "IQ" },
  { id: "bkk", iata: "BKK", icao: "VTBS", city: "Bangkok", country: "TH" },
  { id: "blr", iata: "BLR", icao: "VOBL", city: "Bengaluru", country: "IN" },
  { id: "bna", iata: "BNA", icao: "KBNA", city: "Nashville", country: "US" },
  { id: "bne", iata: "BNE", icao: "YBBN", city: "Brisbane", country: "AU" },
  { id: "bnu", iata: "BNU", icao: "SSBL", city: "Blumenau", country: "BR" },
  { id: "bod", iata: "BOD", icao: "LFBD", city: "Bordeaux", country: "FR" },
  { id: "bog", iata: "BOG", icao: "SKBO", city: "Bogota", country: "CO" },
  { id: "bom", iata: "BOM", icao: "VABB", city: "Mumbai", country: "IN" },
  { id: "bos", iata: "BOS", icao: "KBOS", city: "Boston", country: "US" },
  { id: "bru", iata: "BRU", icao: "EBBR", city: "Zaventem", country: "BE" },
  { id: "bsb", iata: "BSB", icao: "SBBR", city: "Brasília", country: "BR" },
  { id: "bsr", iata: "BSR", icao: "ORMM", city: "Basra", country: "IQ" },
  { id: "bts", iata: "BTS", icao: "LZIB", city: "Bratislava", country: "SK" },
  { id: "bud", iata: "BUD", icao: "LHBP", city: "Budapest", country: "HU" },
  { id: "buf", iata: "BUF", icao: "KBUF", city: "Buffalo", country: "US" },
  { id: "bwn", iata: "BWN", icao: "WBSB", city: "Bandar Seri Begawan", country: "BN" },
  { id: "cai", iata: "CAI", icao: "HECA", city: "Cairo", country: "EG" },
  { id: "can", iata: "CAN", icao: "ZGGG", city: "Guangzhou (Huadu)", country: "CN" },
  { id: "cbr", iata: "CBR", icao: "YSCB", city: "Canberra", country: "AU" },
  { id: "ccp", iata: "CCP", icao: "SCIE", city: "Concepcion", country: "CL" },
  { id: "ccu", iata: "CCU", icao: "VECC", city: "Kolkata", country: "IN" },
  { id: "cdg", iata: "CDG", icao: "LFPG", city: "Paris (Roissy-en-France, Val-d'Oise)", country: "FR" },
  { id: "ceb", iata: "CEB", icao: "RPVM", city: "Cebu City/Lapu-Lapu City", country: "PH" },
  { id: "cfc", iata: "CFC", icao: "SBCD", city: "Caçador", country: "BR" },
  { id: "cgb", iata: "CGB", icao: "SBCY", city: "Cuiabá", country: "BR" },
  { id: "cgd", iata: "CGD", icao: "ZGCD", city: "Changde (Dingcheng)", country: "CN" },
  { id: "cgk", iata: "CGK", icao: "WIII", city: "Jakarta", country: "ID" },
  { id: "cgo", iata: "CGO", icao: "ZHCC", city: "Zhengzhou", country: "CN" },
  { id: "cgy", iata: "CGY", icao: "RPMY", city: "Laguindingan", country: "PH" },
  { id: "chc", iata: "CHC", icao: "NZCH", city: "Christchurch", country: "NZ" },
  { id: "cjb", iata: "CJB", icao: "VOCB", city: "Coimbatore", country: "IN" },
  { id: "ckg", iata: "CKG", icao: "ZUCK", city: "Chongqing", country: "CN" },
  { id: "cle", iata: "CLE", icao: "KCLE", city: "Cleveland", country: "US" },
  { id: "clo", iata: "CLO", icao: "SKCL", city: "Cali", country: "CO" },
  { id: "clt", iata: "CLT", icao: "KCLT", city: "Charlotte", country: "US" },
  { id: "cmb", iata: "CMB", icao: "VCBI", city: "Colombo", country: "LK" },
  { id: "cmh", iata: "CMH", icao: "KCMH", city: "Columbus", country: "US" },
  { id: "cnf", iata: "CNF", icao: "SBCF", city: "Belo Horizonte", country: "BR" },
  { id: "cnn", iata: "CNN", icao: "VOKN", city: "Kannur", country: "IN" },
  { id: "cnx", iata: "CNX", icao: "VTCC", city: "Chiang Mai", country: "TH" },
  { id: "cok", iata: "COK", icao: "VOCI", city: "Kochi", country: "IN" },
  { id: "cor", iata: "COR", icao: "SACO", city: "Cordoba", country: "AR" },
  { id: "cph", iata: "CPH", icao: "EKCH", city: "Copenhagen", country: "DK" },
  { id: "cpt", iata: "CPT", icao: "FACT", city: "Cape Town", country: "ZA" },
  { id: "crk", iata: "CRK", icao: "RPLC", city: "Mabalacat", country: "PH" },
  { id: "csx", iata: "CSX", icao: "ZGHA", city: "Changsha (Changsha)", country: "CN" },
  { id: "ctu", iata: "CTU", icao: "ZUUU", city: "Chengdu (Shuangliu)", country: "CN" },
  { id: "cvg", iata: "CVG", icao: "KCVG", city: "Cincinnati / Covington", country: "US" },
  { id: "cwb", iata: "CWB", icao: "SBCT", city: "Curitiba", country: "BR" },
  { id: "czl", iata: "CZL", icao: "DABC", city: "Constantine", country: "DZ" },
  { id: "czx", iata: "CZX", icao: "ZSCG", city: "Changzhou", country: "CN" },
  { id: "dac", iata: "DAC", icao: "VGHS", city: "Dhaka", country: "BD" },
  { id: "dad", iata: "DAD", icao: "VVDN", city: "Da Nang", country: "VN" },
  { id: "dar", iata: "DAR", icao: "HTDA", city: "Dar es Salaam", country: "TZ" },
  { id: "del", iata: "DEL", icao: "VIDP", city: "New Delhi", country: "IN" },
  { id: "den", iata: "DEN", icao: "KDEN", city: "Denver", country: "US" },
  { id: "dfw", iata: "DFW", icao: "KDFW", city: "Dallas-Fort Worth", country: "US" },
  { id: "dkr", iata: "DKR", icao: "GOOY", city: "Dakar", country: "SN" },
  { id: "dla", iata: "DLA", icao: "FKKD", city: "Douala", country: "CM" },
  { id: "dlc", iata: "DLC", icao: "ZYTL", city: "Dalian (Ganjingzi)", country: "CN" },
  { id: "dme", iata: "DME", icao: "UUDD", city: "Moscow", country: "RU" },
  { id: "dmm", iata: "DMM", icao: "OEDF", city: "Ad Dammam", country: "SA" },
  { id: "doh", iata: "DOH", icao: "OTHH", city: "Doha", country: "QA" },
  { id: "dps", iata: "DPS", icao: "WADD", city: "Kuta, Badung", country: "ID" },
  { id: "dub", iata: "DUB", icao: "EIDW", city: "Dublin", country: "IE" },
  { id: "dur", iata: "DUR", icao: "FALE", city: "Durban", country: "ZA" },
  { id: "dus", iata: "DUS", icao: "EDDL", city: "Düsseldorf", country: "DE" },
  { id: "dxb", iata: "DXB", icao: "OMDB", city: "Dubai", country: "AE" },
  { id: "ebb", iata: "EBB", icao: "HUEN", city: "Entebbe", country: "UG" },
  { id: "ebl", iata: "EBL", icao: "ORER", city: "Arbil", country: "IQ" },
  { id: "evn", iata: "EVN", icao: "UDYZ", city: "Yerevan", country: "AM" },
  { id: "ewr", iata: "EWR", icao: "KEWR", city: "Newark", country: "US" },
  { id: "eze", iata: "EZE", icao: "SAEZ", city: "Buenos Aires (Ezeiza)", country: "AR" },
  { id: "fco", iata: "FCO", icao: "LIRF", city: "Rome", country: "IT" },
  { id: "fih", iata: "FIH", icao: "FZAA", city: "Kinshasa", country: "CD" },
  { id: "fln", iata: "FLN", icao: "SBFL", city: "Florianópolis", country: "BR" },
  { id: "foc", iata: "FOC", icao: "ZSFZ", city: "Fuzhou (Changle)", country: "CN" },
  { id: "for", iata: "FOR", icao: "SBFZ", city: "Fortaleza", country: "BR" },
  { id: "fra", iata: "FRA", icao: "EDDF", city: "Frankfurt am Main", country: "DE" },
  { id: "fsd", iata: "FSD", icao: "KFSD", city: "Sioux Falls", country: "US" },
  { id: "fuo", iata: "FUO", icao: "ZGFS", city: "Foshan (Nanhai)", country: "CN" },
  { id: "gbe", iata: "GBE", icao: "FBSK", city: "Gaborone", country: "BW" },
  { id: "gdl", iata: "GDL", icao: "MMGL", city: "Guadalajara", country: "MX" },
  { id: "geo", iata: "GEO", icao: "SYCJ", city: "Georgetown", country: "GY" },
  { id: "gig", iata: "GIG", icao: "SBGL", city: "Rio De Janeiro", country: "BR" },
  { id: "gnd", iata: "GND", icao: "TGPY", city: "Saint George's", country: "GD" },
  { id: "got", iata: "GOT", icao: "ESGG", city: "Göteborg", country: "SE" },
  { id: "gru", iata: "GRU", icao: "SBGR", city: "São Paulo", country: "BR" },
  { id: "gua", iata: "GUA", icao: "MGGT", city: "Guatemala City", country: "GT" },
  { id: "gum", iata: "GUM", icao: "PGUM", city: "Hagåtña", country: "GU" },
  { id: "gva", iata: "GVA", icao: "LSGG", city: "Geneva", country: "CH" },
  { id: "gyd", iata: "GYD", icao: "UBBB", city: "Baku", country: "AZ" },
  { id: "gye", iata: "GYE", icao: "SEGU", city: "Guayaquil", country: "EC" },
  { id: "gyn", iata: "GYN", icao: "SBGO", city: "Goiânia", country: "BR" },
  { id: "hak", iata: "HAK", icao: "ZJHK", city: "Haikou (Meilan)", country: "CN" },
  { id: "ham", iata: "HAM", icao: "EDDH", city: "Hamburg", country: "DE" },
  { id: "han", iata: "HAN", icao: "VVNB", city: "Hanoi (Soc Son)", country: "VN" },
  { id: "hba", iata: "HBA", icao: "YMHB", city: "Hobart (Cambridge)", country: "AU" },
  { id: "hel", iata: "HEL", icao: "EFHK", city: "Helsinki (Vantaa)", country: "FI" },
  { id: "hfa", iata: "HFA", icao: "LLHA", city: "Haifa", country: "IL" },
  { id: "hgh", iata: "HGH", icao: "ZSHC", city: "Hangzhou", country: "CN" },
  { id: "hkg", iata: "HKG", icao: "VHHH", city: "Hong Kong", country: "HK" },
  { id: "hnl", iata: "HNL", icao: "PHNL", city: "Honolulu, Oahu", country: "US" },
  { id: "hre", iata: "HRE", icao: "FVRG", city: "Harare", country: "ZW" },
  { id: "hyd", iata: "HYD", icao: "VOHS", city: "Hyderabad", country: "IN" },
  { id: "hyn", iata: "HYN", icao: "ZSLQ", city: "Taizhou (Luqiao)", country: "CN" },
  { id: "iad", iata: "IAD", icao: "KIAD", city: "Dulles", country: "US" },
  { id: "iah", iata: "IAH", icao: "KIAH", city: "Houston", country: "US" },
  { id: "icn", iata: "ICN", icao: "RKSI", city: "Seoul", country: "KR" },
  { id: "ind", iata: "IND", icao: "KIND", city: "Indianapolis", country: "US" },
  { id: "isb", iata: "ISB", icao: "OPIS", city: "Attock", country: "PK" },
  { id: "ist", iata: "IST", icao: "LTFM", city: "Istanbul", country: "TR" },
  { id: "isu", iata: "ISU", icao: "ORSJ", city: "Sulaymaniyah", country: "IQ" },
  { id: "ixc", iata: "IXC", icao: "VICG", city: "Chandigarh", country: "IN" },
  { id: "jax", iata: "JAX", icao: "KJAX", city: "Jacksonville", country: "US" },
  { id: "jdo", iata: "JDO", icao: "SBJU", city: "Juazeiro do Norte", country: "BR" },
  { id: "jed", iata: "JED", icao: "OEJN", city: "Jeddah", country: "SA" },
  { id: "jhb", iata: "JHB", icao: "WMKJ", city: "Johor Bahru", country: "MY" },
  { id: "jib", iata: "JIB", icao: "HDAM", city: "Djibouti City", country: "DJ" },
  { id: "jnb", iata: "JNB", icao: "FAOR", city: "Johannesburg", country: "ZA" },
  { id: "jog", iata: "JOG", icao: "WAHH", city: "Yogyakarta", country: "ID" },
  { id: "joi", iata: "JOI", icao: "SBJV", city: "Joinville", country: "BR" },
  { id: "kbp", iata: "KBP", icao: "UKBB", city: "Boryspil", country: "UA" },
  { id: "kch", iata: "KCH", icao: "WBGG", city: "Kuching", country: "MY" },
  { id: "kef", iata: "KEF", icao: "BIKF", city: "Reykjavík", country: "IS" },
  { id: "kgl", iata: "KGL", icao: "HRYR", city: "Kigali", country: "RW" },
  { id: "khh", iata: "KHH", icao: "RCKH", city: "Kaohsiung (Xiaogang)", country: "TW" },
  { id: "khi", iata: "KHI", icao: "OPKC", city: "Karachi", country: "PK" },
  { id: "khn", iata: "KHN", icao: "ZSCN", city: "Nanchang", country: "CN" },
  { id: "kin", iata: "KIN", icao: "MKJP", city: "Kingston", country: "JM" },
  { id: "kix", iata: "KIX", icao: "RJBB", city: "Osaka", country: "JP" },
  { id: "kmg", iata: "KMG", icao: "ZPPP", city: "Kunming", country: "CN" },
  { id: "knu", iata: "KNU", icao: "VEKA", city: "Kanpur", country: "IN" },
  { id: "ktm", iata: "KTM", icao: "VNKT", city: "Kathmandu", country: "NP" },
  { id: "kul", iata: "KUL", icao: "WMKK", city: "Sepang", country: "MY" },
  { id: "kwe", iata: "KWE", icao: "ZUGY", city: "Guiyang (Nanming)", country: "CN" },
  { id: "kwi", iata: "KWI", icao: "OKKK", city: "Kuwait City", country: "KW" },
  { id: "lad", iata: "LAD", icao: "FNLU", city: "Luanda", country: "AO" },
  { id: "las", iata: "LAS", icao: "KLAS", city: "Las Vegas", country: "US" },
  { id: "lax", iata: "LAX", icao: "KLAX", city: "Los Angeles", country: "US" },
  { id: "lca", iata: "LCA", icao: "LCLK", city: "Larnaca", country: "CY" },
  { id: "lhe", iata: "LHE", icao: "OPLA", city: "Lahore", country: "PK" },
  { id: "lhr", iata: "LHR", icao: "EGLL", city: "London", country: "GB" },
  { id: "lhw", iata: "LHW", icao: "ZLLL", city: "Lanzhou (Yongdeng)", country: "CN" },
  { id: "lim", iata: "LIM", icao: "SPJC", city: "Lima", country: "PE" },
  { id: "lis", iata: "LIS", icao: "LPPT", city: "Lisbon", country: "PT" },
  { id: "lju", iata: "LJU", icao: "LJLJ", city: "Zgornji Brnik", country: "SI" },
  { id: "llk", iata: "LLK", icao: "UBBL", city: "Lankaran", country: "AZ" },
  { id: "llw", iata: "LLW", icao: "FWKI", city: "Lumbadzi", country: "MW" },
  { id: "los", iata: "LOS", icao: "DNMM", city: "Lagos", country: "NG" },
  { id: "lpb", iata: "LPB", icao: "SLLP", city: "La Paz / El Alto", country: "BO" },
  { id: "lun", iata: "LUN", icao: "FLKK", city: "Lusaka", country: "ZM" },
  { id: "lux", iata: "LUX", icao: "ELLX", city: "Luxembourg", country: "LU" },
  { id: "lya", iata: "LYA", icao: "ZHLY", city: "Luoyang (Laocheng)", country: "CN" },
  { id: "lys", iata: "LYS", icao: "LFLL", city: "Colombier-Saugnieu, Rhône", country: "FR" },
  { id: "maa", iata: "MAA", icao: "VOMM", city: "Chennai", country: "IN" },
  { id: "mad", iata: "MAD", icao: "LEMD", city: "Madrid", country: "ES" },
  { id: "man", iata: "MAN", icao: "EGCC", city: "Manchester, Greater Manchester", country: "GB" },
  { id: "mao", iata: "MAO", icao: "SBEG", city: "Manaus", country: "BR" },
  { id: "mba", iata: "MBA", icao: "HKMO", city: "Mombasa", country: "KE" },
  { id: "mci", iata: "MCI", icao: "KMCI", city: "Kansas City", country: "US" },
  { id: "mct", iata: "MCT", icao: "OOMS", city: "Muscat/Seeb", country: "OM" },
  { id: "mde", iata: "MDE", icao: "SKRG", city: "Medellín", country: "CO" },
  { id: "mel", iata: "MEL", icao: "YMML", city: "Melbourne", country: "AU" },
  { id: "mem", iata: "MEM", icao: "KMEM", city: "Memphis", country: "US" },
  { id: "mex", iata: "MEX", icao: "MMMX", city: "Mexico City", country: "MX" },
  { id: "mfm", iata: "MFM", icao: "VMMC", city: "Nossa Senhora do Carmo", country: "MO" },
  { id: "mia", iata: "MIA", icao: "KMIA", city: "Miami", country: "US" },
  { id: "mla", iata: "MLA", icao: "LMML", city: "Valletta", country: "MT" },
  { id: "mle", iata: "MLE", icao: "VRMM", city: "Malé", country: "MV" },
  { id: "mnl", iata: "MNL", icao: "RPLL", city: "Manila (Pasay)", country: "PH" },
  { id: "mpm", iata: "MPM", icao: "FQMA", city: "Maputo", country: "MZ" },
  { id: "mrs", iata: "MRS", icao: "LFML", city: "Marignane, Bouches-du-Rhône", country: "FR" },
  { id: "mru", iata: "MRU", icao: "FIMP", city: "Plaine Magnien", country: "MU" },
  { id: "msp", iata: "MSP", icao: "KMSP", city: "Minneapolis", country: "US" },
  { id: "msq", iata: "MSQ", icao: "UMMS", city: "Minsk", country: "BY" },
  { id: "muc", iata: "MUC", icao: "EDDM", city: "Munich", country: "DE" },
  { id: "mxp", iata: "MXP", icao: "LIMC", city: "Ferno (VA)", country: "IT" },
  { id: "nag", iata: "NAG", icao: "VANP", city: "Nagpur", country: "IN" },
  { id: "nbo", iata: "NBO", icao: "HKJK", city: "Nairobi", country: "KE" },
  { id: "njf", iata: "NJF", icao: "ORNI", city: "Najaf", country: "IQ" },
  { id: "nou", iata: "NOU", icao: "NWWW", city: "Nouméa (La Tontouta)", country: "NC" },
  { id: "nqn", iata: "NQN", icao: "SAZN", city: "Neuquén", country: "AR" },
  { id: "nrt", iata: "NRT", icao: "RJAA", city: "Narita", country: "JP" },
  { id: "nvt", iata: "NVT", icao: "SBNF", city: "Navegantes", country: "BR" },
  { id: "oka", iata: "OKA", icao: "ROAH", city: "Naha", country: "JP" },
  { id: "okc", iata: "OKC", icao: "KOKC", city: "Oklahoma City", country: "US" },
  { id: "oma", iata: "OMA", icao: "KOMA", city: "Omaha", country: "US" },
  { id: "ord", iata: "ORD", icao: "KORD", city: "Chicago", country: "US" },
  { id: "orf", iata: "ORF", icao: "KORF", city: "Norfolk", country: "US" },
  { id: "orn", iata: "ORN", icao: "DAOO", city: "Es-Sénia", country: "DZ" },
  { id: "osl", iata: "OSL", icao: "ENGM", city: "Oslo (Gardermoen)", country: "NO" },
  { id: "otp", iata: "OTP", icao: "LROP", city: "Otopeni", country: "RO" },
  { id: "oua", iata: "OUA", icao: "DFFD", city: "Ouagadougou", country: "BF" },
  { id: "pat", iata: "PAT", icao: "VEPT", city: "Patna", country: "IN" },
  { id: "pbh", iata: "PBH", icao: "VQPR", city: "Paro", country: "BT" },
  { id: "pbm", iata: "PBM", icao: "SMJP", city: "Paramaribo", country: "SR" },
  { id: "pdx", iata: "PDX", icao: "KPDX", city: "Portland", country: "US" },
  { id: "per", iata: "PER", icao: "YPPH", city: "Perth", country: "AU" },
  { id: "phl", iata: "PHL", icao: "KPHL", city: "Philadelphia", country: "US" },
  { id: "phx", iata: "PHX", icao: "KPHX", city: "Phoenix", country: "US" },
  { id: "pit", iata: "PIT", icao: "KPIT", city: "Pittsburgh", country: "US" },
  { id: "pkx", iata: "PKX", icao: "ZBAD", city: "Beijing", country: "CN" },
  { id: "pmo", iata: "PMO", icao: "LICJ", city: "Palermo", country: "IT" },
  { id: "pmw", iata: "PMW", icao: "SBPJ", city: "Palmas", country: "BR" },
  { id: "pnh", iata: "PNH", icao: "VDPP", city: "Phnom Penh (Pou Senchey)", country: "KH" },
  { id: "poa", iata: "POA", icao: "SBPA", city: "Porto Alegre", country: "BR" },
  { id: "pos", iata: "POS", icao: "TTPP", city: "Port of Spain", country: "TT" },
  { id: "ppt", iata: "PPT", icao: "NTAA", city: "Papeete", country: "PF" },
  { id: "prg", iata: "PRG", icao: "LKPR", city: "Prague", country: "CZ" },
  { id: "pty", iata: "PTY", icao: "MPTO", city: "Tocumen", country: "PA" },
  { id: "qro", iata: "QRO", icao: "MMQT", city: "Querétaro", country: "MX" },
  { id: "rao", iata: "RAO", icao: "SBRP", city: "Ribeirão Preto", country: "BR" },
  { id: "rdu", iata: "RDU", icao: "KRDU", city: "Raleigh/Durham", country: "US" },
  { id: "ric", iata: "RIC", icao: "KRIC", city: "Richmond", country: "US" },
  { id: "rix", iata: "RIX", icao: "EVRA", city: "Riga", country: "LV" },
  { id: "rmo", iata: "RMO", icao: "LUKK", city: "Chişinău", country: "MD" },
  { id: "ruh", iata: "RUH", icao: "OERK", city: "Riyadh", country: "SA" },
  { id: "run", iata: "RUN", icao: "FMEE", city: "Sainte-Marie", country: "RE" },
  { id: "san", iata: "SAN", icao: "KSAN", city: "San Diego", country: "US" },
  { id: "sap", iata: "SAP", icao: "MHLM", city: "San Pedro Sula", country: "HN" },
  { id: "scl", iata: "SCL", icao: "SCEL", city: "Santiago", country: "CL" },
  { id: "sdq", iata: "SDQ", icao: "MDSD", city: "Santo Domingo", country: "DO" },
  { id: "sea", iata: "SEA", icao: "KSEA", city: "Seattle", country: "US" },
  { id: "sfo", iata: "SFO", icao: "KSFO", city: "San Francisco", country: "US" },
  { id: "sgn", iata: "SGN", icao: "VVTS", city: "Ho Chi Minh City", country: "VN" },
  { id: "sha", iata: "SHA", icao: "ZSSS", city: "Shanghai (Minhang)", country: "CN" },
  { id: "sin", iata: "SIN", icao: "WSSS", city: "Singapore", country: "SG" },
  { id: "sjc", iata: "SJC", icao: "KSJC", city: "San Jose", country: "US" },
  { id: "sjk", iata: "SJK", icao: "SBSJ", city: "São José Dos Campos", country: "BR" },
  { id: "sjo", iata: "SJO", icao: "MROC", city: "San José (Alajuela)", country: "CR" },
  { id: "sjp", iata: "SJP", icao: "SBSR", city: "São José do Rio Preto", country: "BR" },
  { id: "sju", iata: "SJU", icao: "TJSJ", city: "San Juan", country: "PR" },
  { id: "sjw", iata: "SJW", icao: "ZBSJ", city: "Shijiazhuang", country: "CN" },
  { id: "skg", iata: "SKG", icao: "LGTS", city: "Thessaloniki", country: "GR" },
  { id: "skp", iata: "SKP", icao: "LWSK", city: "Ilinden", country: "MK" },
  { id: "smf", iata: "SMF", icao: "KSMF", city: "Sacramento", country: "US" },
  { id: "sod", iata: "SOD", icao: "SDCO", city: "Sorocaba", country: "BR" },
  { id: "sof", iata: "SOF", icao: "LBSF", city: "Sofia", country: "BG" },
  { id: "ssa", iata: "SSA", icao: "SBSV", city: "Salvador", country: "BR" },
  { id: "sti", iata: "STI", icao: "MDST", city: "Santiago", country: "DO" },
  { id: "stl", iata: "STL", icao: "KSTL", city: "St Louis", country: "US" },
  { id: "str", iata: "STR", icao: "EDDS", city: "Stuttgart", country: "DE" },
  { id: "suv", iata: "SUV", icao: "NFNA", city: "Nausori", country: "FJ" },
  { id: "syd", iata: "SYD", icao: "YSSY", city: "Sydney (Mascot)", country: "AU" },
  { id: "szx", iata: "SZX", icao: "ZGSZ", city: "Shenzhen", country: "CN" },
  { id: "tao", iata: "TAO", icao: "ZSQD", city: "Qingdao (Jiaozhou)", country: "CN" },
  { id: "tbs", iata: "TBS", icao: "UGTB", city: "Tbilisi", country: "GE" },
  { id: "ten", iata: "TEN", icao: "ZUTR", city: "Tongren (Daxing)", country: "CN" },
  { id: "tgu", iata: "TGU", icao: "MHTG", city: "Tegucigalpa", country: "HN" },
  { id: "tia", iata: "TIA", icao: "LATI", city: "Rinas", country: "AL" },
  { id: "tll", iata: "TLL", icao: "EETN", city: "Tallinn", country: "EE" },
  { id: "tlv", iata: "TLV", icao: "LLBG", city: "Tel Aviv", country: "IL" },
  { id: "tna", iata: "TNA", icao: "ZSJN", city: "Jinan (Licheng)", country: "CN" },
  { id: "tnr", iata: "TNR", icao: "FMMI", city: "Antananarivo", country: "MG" },
  { id: "tpa", iata: "TPA", icao: "KTPA", city: "Tampa", country: "US" },
  { id: "tpe", iata: "TPE", icao: "RCTP", city: "Taoyuan", country: "TW" },
  { id: "tun", iata: "TUN", icao: "DTTA", city: "Tunis", country: "TN" },
  { id: "tyn", iata: "TYN", icao: "ZBYN", city: "Taiyuan", country: "CN" },
  { id: "udi", iata: "UDI", icao: "SBUL", city: "Uberlândia", country: "BR" },
  { id: "udr", iata: "UDR", icao: "VAUD", city: "Udaipur", country: "IN" },
  { id: "uio", iata: "UIO", icao: "SEQM", city: "Quito", country: "EC" },
  { id: "uln", iata: "ULN", icao: "ZMUB", city: "Ulaanbaatar", country: "MN" },
  { id: "urt", iata: "URT", icao: "VTSB", city: "Surat Thani", country: "TH" },
  { id: "vcp", iata: "VCP", icao: "SBKP", city: "Campinas", country: "BR" },
  { id: "vie", iata: "VIE", icao: "LOWW", city: "Vienna", country: "AT" },
  { id: "vix", iata: "VIX", icao: "SBVT", city: "Vitória", country: "BR" },
  { id: "vno", iata: "VNO", icao: "EYVI", city: "Vilnius", country: "LT" },
  { id: "vte", iata: "VTE", icao: "VLVT", city: "Vientiane", country: "LA" },
  { id: "waw", iata: "WAW", icao: "EPWA", city: "Warsaw", country: "PL" },
  { id: "wdh", iata: "WDH", icao: "FYWH", city: "Windhoek", country: "NA" },
  { id: "wlg", iata: "WLG", icao: "NZWN", city: "Wellington", country: "NZ" },
  { id: "wro", iata: "WRO", icao: "EPWR", city: "Wrocław", country: "PL" },
  { id: "xap", iata: "XAP", icao: "SBCH", city: "Chapecó", country: "BR" },
  { id: "xfn", iata: "XFN", icao: "ZHXF", city: "Xiangyang (Xiangzhou)", country: "CN" },
  { id: "xiy", iata: "XIY", icao: "ZLXY", city: "Xi'an", country: "CN" },
  { id: "xnh", iata: "XNH", icao: "ORTL", city: "Nasiriyah", country: "IQ" },
  { id: "zag", iata: "ZAG", icao: "LDZA", city: "Velika Gorica", country: "HR" },
  { id: "zrh", iata: "ZRH", icao: "LSZH", city: "Zurich", country: "CH" },
] as const;

export const CLOUDFLARE_POPS: readonly PopAirport[] = POP_IDENTITY.map((pop) => ({
  ...pop,
  runways: RUNWAYS_BY_ICAO[pop.icao],
}));

export function find_pop(id: string): PopAirport | undefined {
  return CLOUDFLARE_POPS.find((pop) => pop.id === id);
}

// --- Mechanical generation: OurAirports runways.csv -> Runway[] ----------
// Used only by scripts/fetch-runways.ts, kept here (like
// satellite-catalog.ts's satcat parsing) so the logic that decides what
// survives is tested directly rather than embedded in a script.

export interface RunwayCsvRow {
  airport_ident: string;
  length_ft: string;
  width_ft: string;
  closed: string;
  le_ident: string;
  le_latitude_deg: string;
  le_longitude_deg: string;
  he_ident: string;
  he_latitude_deg: string;
  he_longitude_deg: string;
}

const RUNWAY_CSV_COLUMNS = [
  "airport_ident",
  "length_ft",
  "width_ft",
  "closed",
  "le_ident",
  "le_latitude_deg",
  "le_longitude_deg",
  "he_ident",
  "he_latitude_deg",
  "he_longitude_deg",
] as const;

// Splits one CSV line, honouring double-quoted fields (a quoted field may
// hold commas, and "" inside quotes is a literal quote).
function split_csv_line(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

// Parses OurAirports's runways.csv down to the columns select_pop_runways
// needs. Throws when one of them is missing: a renamed column would
// otherwise select nothing and ship an empty diagram without any error.
export function parse_runways_csv(csv: string): RunwayCsvRow[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.length > 0);
  const header = split_csv_line(lines[0] ?? "");
  const index: Record<string, number> = {};
  for (const column of RUNWAY_CSV_COLUMNS) {
    const position = header.indexOf(column);
    if (position === -1) {
      throw new Error(`runways.csv is missing the ${column} column`);
    }
    index[column] = position;
  }

  return lines.slice(1).map((line) => {
    const fields = split_csv_line(line);
    return {
      airport_ident: fields[index.airport_ident],
      length_ft: fields[index.length_ft],
      width_ft: fields[index.width_ft],
      closed: fields[index.closed],
      le_ident: fields[index.le_ident],
      le_latitude_deg: fields[index.le_latitude_deg],
      le_longitude_deg: fields[index.le_longitude_deg],
      he_ident: fields[index.he_ident],
      he_latitude_deg: fields[index.he_latitude_deg],
      he_longitude_deg: fields[index.he_longitude_deg],
    };
  });
}

function to_finite_number(value: string): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Groups runways.csv rows by ICAO code, keeping only the ICAOs asked for
// and converting each surviving row into one physical Runway. A row
// missing a coordinate, length or width is dropped rather than producing a
// runway drawn at (NaN, NaN); an ICAO with no surviving rows is left out
// of the result entirely (not an empty array), matching the "no data yet"
// vs. "genuinely no runways" distinction PopAirport#runways relies on.
export function select_pop_runways(
  rows: readonly RunwayCsvRow[],
  icaos: readonly string[],
): Record<string, Runway[]> {
  const wanted = new Set(icaos);
  const by_icao: Record<string, Runway[]> = {};

  for (const row of rows) {
    if (!wanted.has(row.airport_ident)) continue;

    const length_ft = to_finite_number(row.length_ft);
    const width_ft = to_finite_number(row.width_ft);
    const le_lat = to_finite_number(row.le_latitude_deg);
    const le_lon = to_finite_number(row.le_longitude_deg);
    const he_lat = to_finite_number(row.he_latitude_deg);
    const he_lon = to_finite_number(row.he_longitude_deg);
    if (length_ft === null || width_ft === null || le_lat === null || le_lon === null || he_lat === null || he_lon === null) {
      continue;
    }

    const runway: Runway = {
      designator: `${row.le_ident}/${row.he_ident}`,
      low_end: { ident: row.le_ident, lat: le_lat, lon: le_lon },
      high_end: { ident: row.he_ident, lat: he_lat, lon: he_lon },
      length_ft,
      width_ft,
      closed: row.closed === "1",
    };

    (by_icao[row.airport_ident] ??= []).push(runway);
  }

  return by_icao;
}
