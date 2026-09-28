/**
 * Preparation checklist, adapted from the Jejak Ancala trip sheets
 * ("The Journey of Jejak Ancala": Logistik and Medik tabs for Arjuno and
 * Merbabu). Only the item lists are used: no names, prices or vendors.
 * Brand names from the sheet become generic items with the familiar local
 * name in brackets.
 */

export type Urgency = "mandatory" | "optional";

export interface PrepItem {
  id: string;
  label: string;
  /** Indonesian name as used in the trip sheets. */
  id_label?: string;
  qty?: string;
  urgency: Urgency;
  note?: string;
}

export interface PrepSection {
  id: string;
  title: string;
  subtitle: string;
  items: PrepItem[];
}

const m = (id: string, label: string, id_label?: string, qty?: string, note?: string): PrepItem => ({
  id,
  label,
  id_label,
  qty,
  urgency: "mandatory",
  note,
});
const o = (id: string, label: string, id_label?: string, qty?: string, note?: string): PrepItem => ({
  id,
  label,
  id_label,
  qty,
  urgency: "optional",
  note,
});

export const PREP_SECTIONS: PrepSection[] = [
  {
    id: "plan",
    title: "Trip plan",
    subtitle: "Before you leave home",
    items: [
      m("closures", "Checked live closures and advisories for this mountain"),
      m("weather", "Checked the forecast for hiking days"),
      m("plan-shared", "Shared route and return time with someone at home"),
      m("offline-pack", "Downloaded the offline pack for this trail"),
      m("transport", "Transport and meeting point confirmed", "Meeting point & kendaraan"),
      m("daylight", "Start time lets you reach camp before dark"),
    ],
  },
  {
    id: "docs",
    title: "Documents",
    subtitle: "Registration and permits",
    items: [
      m("health-letter", "Health certificate from a doctor", "Surat sehat", "1 per person"),
      m("simaksi", "Climbing permit, printed", "SIMAKSI (di-print)", "1 per person"),
      m("id-card", "ID card", "KTP"),
      o("insurance", "Travel / accident insurance details"),
    ],
  },
  {
    id: "personal",
    title: "Personal gear",
    subtitle: "Everyone carries their own",
    items: [
      m("shoes", "Hiking shoes (wear them)", "Sepatu hiking (dipakai)"),
      m("sandals", "Sandals / mountain sandals", "Sandal gunung"),
      m("windbreaker", "Mountain jacket / windbreaker", "Jaket gunung"),
      m("raincoat", "Poncho or raincoat", "Ponco / jas hujan"),
      m("baselayer", "Base layer", "Inner (baselayer)", "1"),
      m("change-shirt", "Change of clothes", "Baju ganti", "2"),
      m("change-pants", "Change of trousers", "Celana ganti", "2"),
      m("underwear", "Underwear", "Pakaian dalam", "3"),
      m("socks", "Thick socks", "Kaos kaki tebal", "2"),
      m("gloves", "Gloves", "Sarung tangan", "2"),
      m("hat", "Hat (wear it)", "Topi (dipakai)"),
      m("buff", "Buff / neck gaiter", "Buff"),
      m("headlamp", "Headlamp + spare batteries", "Headlamp + batu baterai"),
      m("bottle", "Small water bottle", "Botol minum kecil"),
      m("whistle", "Whistle", "Pluit"),
      m("knife", "Folding knife", "Pisau lipat"),
      m("dirty-bag", "Plastic bags for dirty clothes", "Plastik pakaian kotor", "2"),
      m("summit-pack", "Summit daypack", "Summit backpack"),
      m("cutlery", "Bowl / plate and spoon", "Mangkok / piring, sendok"),
      m("handwarmer", "Hand warmers", "Handwarmer", "2"),
      o("sweater", "Crewneck / sweater", "Crewneck / sweater"),
      o("beanie", "Beanie", "Kupluk"),
      o("sleeves", "Arm sleeves (wear them)", "Manset tangan"),
      o("poles", "Trekking poles", "Trekking pole"),
      o("sunglasses", "Sunglasses", "Sun glass"),
      o("meds-personal", "Personal medicines", "Obat-obatan pribadi"),
      o("wet-tissue", "Wet wipes", "Tissue basah"),
    ],
  },
  {
    id: "team",
    title: "Team gear",
    subtitle: "Shared by the group; assign who carries what",
    items: [
      m("tent", "Tents + pegs", "Tenda + pasak"),
      m("flysheet", "Flysheet", "Flysheet"),
      m("mats", "Sleeping mats", "Matras", "1 per person"),
      m("sleeping-bags", "Sleeping bags", "Sleeping bag", "1 per person"),
      m("stove", "Portable stove", "Kompor portable"),
      m("gas", "Gas canisters", "Gas kaleng"),
      m("nesting", "Cook set", "Nesting"),
      m("lighter", "Lighters", "Korek gas"),
      m("water-bag", "Water bags (10 L)", "Water bag 10 L"),
      m("tent-light", "Tent lights", "Lampu tenda"),
      m("torch", "Torches", "Senter"),
      m("emergency-blanket", "Emergency blankets", "Emergency blanket", "1 per person"),
      m("rain-covers", "Rain covers for packs", "Rain cover carrier / daypack"),
      m("radio", "Two-way radios", "HT", "2"),
      m("rope", "Rope", "Tali"),
      m("trash-bags", "Trash bags: carry all rubbish out", "Trash bag"),
      m("shovel", "Small shovel", "Sekop"),
      o("food-paper", "Food wrapping paper and cups", "Kertas nasi, cup kertas"),
    ],
  },
  {
    id: "firstaid",
    title: "First aid",
    subtitle: "Group kit (P3K)",
    items: [
      m("gauze", "Sterile gauze", "Kasa steril"),
      m("scissors", "Small scissors", "Gunting kecil"),
      m("bandage", "Roller bandages", "Perban gulung", "2"),
      m("tape", "Medical tape", "Plester"),
      m("plasters", "Plasters", "Hansaplast"),
      m("antiseptic", "Antiseptic wound spray", "Antiseptik (spray)"),
      m("pressure-dressing", "Pressure dressings", "Pembalut penekan luka", "2"),
      m("paracetamol", "Paracetamol", "Panadol / paracetamol"),
      m("antacid", "Antacid", "Promaag"),
      m("antidiarrheal", "Anti-diarrhoea tablets", "Diapet"),
      m("itch-cream", "Anti-itch cream (hydrocortisone)", "Salep gatal"),
      m("fever-patch", "Cooling fever patches", "Bye Bye Fever"),
      m("muscle-rub", "Muscle rub / pain patches", "Counterpain, koyo"),
      o("aromatic-oil", "Aromatic oil", "Freshcare / minyak angin"),
      o("herbal", "Herbal cold remedy", "Tolak Angin"),
      o("pads", "Sanitary pads", "Pembalut / softex"),
    ],
  },
];

export const ALL_PREP_ITEMS = PREP_SECTIONS.flatMap((s) => s.items);
