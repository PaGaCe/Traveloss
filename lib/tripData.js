// Datos iniciales del viaje. Coordenadas aproximadas reales para cada punto,
// usadas por el mapa (Leaflet + OpenStreetMap) y el cálculo de rutas (OSRM).

export const INITIAL_TRIP = {
  id: "eslovenia-2026",
  title: "Eslovenia 2026",
  place: "Liubliana → Valle del Soča",
  dateLabel: "3 – 11 Sep",
  stampColor: "#2A9D8F",
  days: [
    {
      id: "d1",
      label: "Día 1",
      date: "3 Sep",
      items: [
        { id: "s1", time: "07:45", title: "Llegada BCN → LJU", place: "Aeropuerto de Liubliana", type: "flight", note: "Vueling", details: "BCN – LJU 03/09 05:35–07:45 h · Vueling · comprar el lunes 06/07", lat: 46.2237, lng: 14.4576 },
        { id: "s2", time: "09:30", title: "Plaza del Congreso", place: "Centro de Liubliana", type: "sight", note: "Aquí se izó la bandera eslovena en 1991", lat: 46.05, lng: 14.5058 },
        { id: "s3", time: "10:00", title: "Plaza Prešeren", place: "Casco antiguo", type: "sight", note: "El poeta mira hacia la ventana de su amor imposible", lat: 46.0514, lng: 14.5061 },
        { id: "s4", time: "10:30", title: "Puente Triple", place: "Río Ljubljanica", type: "sight", lat: 46.0509, lng: 14.5057 },
        { id: "s5", time: "11:00", title: "Paseo Mestni trg y Stari trg", place: "Casco histórico", type: "activity", lat: 46.0495, lng: 14.5057 },
        { id: "s6", time: "12:30", title: "Catedral de San Nicolás", place: "Casco antiguo", type: "sight", note: "Entrada 2€", lat: 46.0512, lng: 14.5075 },
        { id: "s7", time: "13:00", title: "Mercado Central", place: "Junto al río", type: "food", note: "Probar la miel de abeja carniola", lat: 46.0518, lng: 14.5069 },
        { id: "s8", time: "16:00", title: "Castillo de Liubliana", place: "Colina de 367 m", type: "sight", note: "Subida en funicular, bajada andando", lat: 46.0489, lng: 14.5093 },
        { id: "s9", time: "19:00", title: "Atardecer en Café Nebotičnik", place: "Rascacielos, planta 12", type: "food", note: "Probar la gibanica prekmurska", lat: 46.0526, lng: 14.5057 },
      ],
    },
    {
      id: "d2",
      label: "Día 2",
      date: "4 Sep",
      items: [
        { id: "s10", time: "09:00", title: "Parque Tivoli", place: "5 km² de zona verde", type: "sight", lat: 46.0553, lng: 14.4917 },
        { id: "s11", time: "10:00", title: "Puente de los Dragones", place: "Símbolo de la ciudad", type: "sight", lat: 46.0521, lng: 14.5088 },
        { id: "s12", time: "11:00", title: "Mercado Odprta Kuhna", place: "Plaza Pogačar", type: "food", note: "Ir con hambre", lat: 46.0516, lng: 14.5075 },
        { id: "s13", time: "14:00", title: "Traslado a Kamniška Bistrica", place: "~1 h en coche", type: "activity", travel: "🚗 ~1 h en coche desde Liubliana", lat: 46.32, lng: 14.61 },
        { id: "s14", time: "15:30", title: "Teleférico + telesilla", place: "Velika Planina", type: "activity", note: "850 m de desnivel", lat: 46.3128, lng: 14.635 },
        { id: "s15", time: "17:00", title: "Paseo por el poblado alpino", place: "Velika Planina", type: "activity", note: "Queserías artesanales", lat: 46.3167, lng: 14.6417 },
        { id: "s16", time: "20:00", title: "Cena y noche en refugio", place: "Velika Planina", type: "stay", lat: 46.3167, lng: 14.6417 },
      ],
    },
    {
      id: "d3",
      label: "Día 3",
      date: "5 Sep",
      items: [
        { id: "s17", time: "06:30", title: "Amanecer sobre los Alpes", place: "Velika Planina", type: "activity", lat: 46.3167, lng: 14.6417 },
        { id: "s18", time: "08:00", title: "Ruta circular (4h)", place: "Gradišče · Planina Dol · Mala Planina", type: "activity", lat: 46.32, lng: 14.65 },
        { id: "s19", time: "13:00", title: "Almuerzo con vistas", place: "Terraza en la meseta", type: "food", lat: 46.315, lng: 14.64 },
        { id: "s20", time: "15:00", title: "Bajada + traslado a Bled", place: "1:30 h en coche", type: "activity", travel: "🚗 ~1:30 h en coche desde Velika Planina", lat: 46.3683, lng: 14.1146 },
        { id: "s21", time: "18:00", title: "Subida a Ojstrica", place: "Mirador, 25 min de ascenso", type: "activity", lat: 46.3733, lng: 14.085 },
        { id: "s22", time: "21:00", title: "Cena y noche en Bled", place: "Lago Bled", type: "stay", lat: 46.3683, lng: 14.1146 },
      ],
    },
    {
      id: "d4",
      label: "Día 4",
      date: "6 Sep",
      items: [
        { id: "s23", time: "09:00", title: "Vuelta al lago Bled", place: "6 km caminando", type: "activity", lat: 46.3683, lng: 14.1146 },
        { id: "s24", time: "11:00", title: "Barca a la Isla de Bled", place: "Iglesia de la Asunción", type: "activity", lat: 46.3639, lng: 14.0925 },
        { id: "s25", time: "13:00", title: "Castillo de Bled", place: "Acantilado norte", type: "sight", lat: 46.3689, lng: 14.1061 },
        { id: "s26", time: "16:00", title: "Actividad de aventura", place: "Tirolina, rafting o parapente", type: "activity", lat: 46.37, lng: 14.12 },
        { id: "s27", time: "19:00", title: "Probar Kremna Rezina", place: "Pastelería en Bled", type: "food", note: "El postre más famoso del país", lat: 46.3684, lng: 14.114 },
      ],
    },
    {
      id: "d5",
      label: "Día 5",
      date: "7 Sep",
      items: [
        { id: "s28", time: "08:00", title: "Traslado a Bohinj", place: "~30 min en coche", type: "activity", travel: "🚗 ~30 min en coche desde Bled", lat: 46.2742, lng: 13.8778 },
        { id: "s29", time: "09:00", title: "Ribčev Laz", place: "Puente de piedra, iglesia S. Juan Bautista", type: "sight", lat: 46.2742, lng: 13.8778 },
        { id: "s30", time: "10:00", title: "Gargantas de Mostnica", place: "Desde Stara Fužina", type: "activity", note: "Puente del Diablo · entrada 4€", lat: 46.2917, lng: 13.8794 },
        { id: "s31", time: "12:30", title: "Descanso en el valle de Voje", place: "Refugio de montaña", type: "food", lat: 46.305, lng: 13.885 },
        { id: "s32", time: "15:00", title: "Cascada Savica", place: "78 m de altura", type: "sight", lat: 46.3106, lng: 13.8386 },
        { id: "s33", time: "19:30", title: "Atardecer en Ukanc", place: "Extremo oeste del lago", type: "activity", lat: 46.2822, lng: 13.8386 },
      ],
    },
    {
      id: "d6",
      label: "Día 6",
      date: "8 Sep",
      items: [
        { id: "s34", time: "07:00", title: "Paso de Vršič", place: "1.611 m · ~50 curvas", type: "activity", note: "Madrugar para evitar tráfico", travel: "🚗 Salida temprano desde Bled", lat: 46.4331, lng: 13.7461 },
        { id: "s35", time: "09:00", title: "Iglesia rusa y miradores", place: "Camino al puerto", type: "sight", lat: 46.4308, lng: 13.7444 },
        { id: "s36", time: "10:30", title: "Valle de Trenta", place: "Nacimiento del río Soča", type: "sight", lat: 46.3783, lng: 13.6928 },
        { id: "s37", time: "11:30", title: "Gran Garganta del Soča", place: "Velika Korita Soče", type: "sight", lat: 46.3592, lng: 13.6167 },
        { id: "s38", time: "13:30", title: "Bovec", place: "Rafting, kayak o cascada Boka", type: "activity", lat: 46.3378, lng: 13.5539 },
        { id: "s39", time: "16:00", title: "Kobarid", place: "Cascada Kozjak", type: "sight", lat: 46.2489, lng: 13.5789 },
        { id: "s40", time: "18:00", title: "Garganta de Tolmin", place: "La más profunda del país", type: "activity", lat: 46.1928, lng: 13.7256 },
        { id: "s41", time: "20:00", title: "Most na Soči", place: "Embalse turquesa", type: "sight", lat: 46.1789, lng: 13.7 },
      ],
    },
    {
      id: "d7",
      label: "Día 7",
      date: "10 Sep",
      items: [
        { id: "s42", time: "20:55", title: "Vuelo LJU → ORY", place: "Aeropuerto de Liubliana", type: "flight", details: "Transavia · Llegada a París-Orly 22:50 h", lat: 46.2237, lng: 14.4576 },
      ],
    },
    {
      id: "d8",
      label: "Día 8",
      date: "11 Sep",
      items: [
        { id: "s43", time: "06:15", title: "Vuelo ORY → SVQ", place: "París-Orly", type: "flight", details: "Transavia · Llegada a Sevilla 08:40 h", lat: 48.7262, lng: 2.3652 },
      ],
    },
  ],
};

export const ICON_BY_TYPE = {
  food: "utensils",
  sight: "camera",
  flight: "plane",
  stay: "bed",
  activity: "sparkles",
};

export const TYPE_LABEL = {
  sight: "Lugar",
  food: "Comida",
  activity: "Plan",
  stay: "Hotel",
  flight: "Transporte",
};
