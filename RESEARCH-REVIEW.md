# Research review: where sources disagreed with our data

Found while researching the mountain stories (Sept 2026) and **resolved on
2026-09-27** at the owner's request ("fix all"). Each row says what changed in
`server/data/mountains.csv`. Where a reliable source agreed with our figure, the
figure was kept and the reason is given. Changed rows carry `last_updated = 2026-09`.

| Mountain | Field | Was | Sources said | Resolution | Source |
|---|---|---|---|---|---|
| semeru | water_sources | Ranu Kumbolo lake (must treat/filter); no reliable water above Kumbolo | A spring called Sumbermani at the end of Kalimati, about 1 hour round trip from camp | Fixed. | [link](https://www.gunungbagging.com/semeru/) |
| welirang | ascent_time_hours | 7-9 | About 8-10 hours to the summit via Tretes (starts ~900 m), 15-20 km | Fixed. | [link](https://cozzy.id/en/news/wisata-pendakian-gunung-welirang-jalur-daya-tarik-dan-tips-pendakian) |
| raung | elevation_m | 3332 | 3,344 m cited by some sources (Wikipedia gives 3,332 m, matching ours) | Kept 3,332 m: Wikipedia matches ours; 3,344 m is the outlier. | [link](https://volcanolive.com/raung.html) |
| argopuro | distance_round_trip_km | ~30 (one-way traverse) or ~40 (return via same route) | Longest route in Java with a total distance of 40 km (traverse) | Fixed. | [link](https://www.eigeradventure.com/blog/profil-gunung-argopuro-gunung-paling-lama-didaki-di-indonesia/) |
| penanggungan | unique_selling_point | Over 80 ancient Hindu-Buddhist temple ruins scattered along trail | 131 archaeological sites recorded by Ubaya in 2013; by 2016 Ubaya reported 134 newly found sites (hundreds in total) | Fixed. | [link](https://core.ac.uk/download/288223904.pdf) |
| panderman | critical_points | None significant | Final section Watu Gede to Puncak Basundara (~30 min) is very steep, described as about 80 degrees; climbers must take care | Fixed. | [link](https://www.traveloka.com/id-id/explore/destination/gunung-panderman-destinasi-pendakian/1007425) |
| panderman | trail_type | Open grassland; pine forest; open ridge | Trail starts steep through dense pine forest; upper part rocky with larger rocks and steeper grades | Fixed. | [link](https://www.traveloka.com/id-id/explore/destination/gunung-panderman-destinasi-pendakian/1007425) |
| panderman | elevation_m | 2045 | 2,048 m | Kept 2,045 m: only one tour-operator source gives 2,048 m. | [link](https://smartine-indonesiatravel.com/en/your-tour/long-tours/take-a-break?id=134) |
| panderman | ascent_time_hours | 2-3 | About 3.5 hours to the summit (2-3 h to Latar Ombo, +~1 h to Watu Gede, +~30 min to summit) | Fixed. | [link](https://smartine-indonesiatravel.com/en/your-tour/long-tours/take-a-break?id=134) |
| butak | water_sources | None on traverse — carry all water from Panderman basecamp | The summit savanna where the Panderman route ends has water sources and small pools (sendang); only the Sirah Kencong route is described as having no water | Fixed. | [link](https://www.orami.co.id/magazine/gunung-butak) |
| kawi | elevation_m | 2551 | 2,603 m (Unpam expedition report); Global Volcanism Program lists the Kawi-Butak complex at 2,651 m. Wikipedia gives 2,551 m, matching ours | Kept 2,551 m: Wikipedia matches ours; 2,603/2,651 m refer to other points. | [link](https://kemahasiswaan.unpam.ac.id/ekspedisi-rimba-gunung-angkatan-xiv-gunung-kawi-2603-mdpl-butak-2868-mdpl/) |
| kawi | ascent_time_hours | 5-7 | Usually about 6-8 hours depending on pace | Fixed. | [link](https://cozzy.id/news/panduan-lengkap-pendakian-gunung-kawi-malang-rute-mitos-dan-tips-berwisata) |
| anjasmoro | access_status | open | Hiking on Anjasmoro is prohibited: it is a Tahura Raden Soerjo conservation area and climbing was closed (reported 2022, repeated 2024). | Fixed. | [link](https://travel.kompas.com/read/2022/02/19/180600327/gunung-anjasmoro-di-jawa-timur-bukan-untuk-pendakian-ini-alasannya) |
| anjasmoro | basecamp_name | Basecamp via Tretes / Wonosunyo | Trip reports name Carangwulung/Wonosalam (Jombang), Nawangan/Rejosari (Mojokerto) and Cangar (Batu) as routes; none mention Tretes/Wonosunyo. | Fixed. | [link](https://www.detik.com/jatim/wisata/d-7420730/7-fakta-menarik-pegunungan-anjasmoro-yang-memiliki-40-puncak) |
| anjasmoro | elevation_m | 2282 | Detik lists Gunung Biru, the top of Anjasmoro, at 2,277 m (other sources say 2,282 m) | Kept 2,282 m: other sources agree with ours. | [link](https://www.detik.com/jatim/wisata/d-7420730/7-fakta-menarik-pegunungan-anjasmoro-yang-memiliki-40-puncak) |
| wilis | elevation_m | 2169 | Gunung Wilis (southern peak) 2,182 m; Wikipedia gives Mount Wilis as 2,563 m (the Liman summit) | Fixed. | [link](https://www.gunungbagging.com/liman/) |
| wilis | basecamp_name | Basecamp Ngliman (Nganjuk) / Basecamp Kare (Madiun) | The Kare route leads to Liman/Ngliman peak (2,563 m), not the 2,182 m Wilis peak; Wilis peak is climbed separately (e.g. via Sedudo) and cannot be linked to Liman | Fixed. | [link](https://www.gunungbagging.com/liman/) |
| liman | basecamp_name | Basecamp Ngliman (shared with Wilis access) | Popular routes to Liman are via Kare/Pulosari (Madiun) and Mojo (Kediri); Gunung Bagging says Liman and Wilis peaks are separate climbs that cannot be linked | Fixed. | [link](https://www.gunungbagging.com/liman/) |
| kelud | critical_points / unique_selling_point | Active lava dome created in 2014; new lava dome visible | The lava dome formed in 2007; the 2014 eruption destroyed it rather than creating one | Fixed. | [link](https://en.wikipedia.org/wiki/Kelud) |
| lemongan | elevation_m | 1651 | Several trip reports give 1,676 m (one gives 1,671 m) | Kept 1,651 m: trip reports only; reference sources give 1,651 m. | [link](https://www.manusialembah.com/2017/05/pendakian-gunung-lemongan-1676-mdpl-via.html) |
| lemongan | unique_selling_point | near Semeru area | Lamongan sits between the Tengger and Iyang-Argapura complexes | Fixed. | [link](https://www.volcanodiscovery.com/lamongan.html) |
| pundak | basecamp_name | Basecamp Pacet / Trawas area | Basecamps are in Claket village, Pacet (via OWA Tahura R. Soerjo or Puthuk Siwur); Trawas not mentioned | Fixed. | [link](https://www.fikriamiruddin.com/2018/11/ekspedisi-gunung-pundak-1585-mdpl.html) |
| ranti | elevation_m | 2664 | True summit 2,626 m, north top 2,578 m (Gunung Bagging); Indonesian media give 2,601 m | Fixed. | [link](https://www.gunungbagging.com/ijen/) |
| ranti | ascent_time_hours | Unknown | About 2 h to the viewpoint, less to descend | Fixed. | [link](https://www.gunungbagging.com/ijen/) |
| ranti | minimum_gear / difficulty | Full overnight kit; local guide strongly recommended; Intermediate | Usually done as a ~2 h day hike; media describe it as suitable for beginners | Fixed. | [link](https://www.gunungbagging.com/ijen/) |
| merapi-ungup | access_status | open | Merapi lies in the core of Cagar Alam Kawah Ijen Merapi Ungup-ungup; climbing is off-limits except with official permits from the forestry authority | Fixed. | [link](https://banyuwangi.jatimnetwork.com/banyuwangi/33210325138/kawah-di-banyuwangi-ini-terlarang-bagi-pendaki-miliki-ketinggian-2800-mdpl-bukan-kawah-ijen-melainkan) |
| merapi-ungup | elevation_m | 2800 | 2,799 m in some sources | Kept 2,800 m: 1 m difference from a social-media post. | [link](https://www.facebook.com/pendakilawas01/posts/gunung-merapi-ini-memiliki-ketinggian-2799-mdpl-dan-merupakan-zona-terlarang-kar/983417653967592/) |
| merapi-ungup | key_hazards | Active volcanic complex; sulfur gas | Merapi's own crater is described as extinct/dormant (the active vent is Kawah Ijen next door) | Fixed: hazard now names the reserve and gas from neighbouring Kawah Ijen. | [link](https://banyuwangi.jatimnetwork.com/banyuwangi/33210325138/kawah-di-banyuwangi-ini-terlarang-bagi-pendaki-miliki-ketinggian-2800-mdpl-bukan-kawah-ijen-melainkan) |
| lawu | elevation_m | 3265 | 3,266 m (Hargo Dumilah) in several sources | Kept 3,265 m: 1 m difference. | [link](https://observerid.com/climbing-the-sacred-mount-lawu/) |
| merbabu | elevation_m | 3145 | Kenteng Songo 3,142 m; Triangulasi 3,166 m (per travel site); Gunung Bagging says Triangulasi is 3 m higher than Kenteng Songo | Kept 3,145 m: sources disagree on which peak is highest. | [link](https://www.gunungbagging.com/merbabu/) |
| merapi | elevation_m | 2930 | about 2,910 m; summit height fluctuates by tens of metres with dome growth/collapse | Fixed. | [link](https://en.wikipedia.org/wiki/Mount_Merapi) |
| merapi | distance_round_trip_km | ~12 | around 9 km from the bottom of the paved road in Selo to the summit and back | Fixed. | [link](https://travelexx.com/hiking-indonesia-mount-merapi/) |
| merapi | basecamp_name | New Selo (North) / Balerante / Kinahrejo (South) | Southern (Kaliurang) route is banned as too dangerous; New Selo is the basecamp | Fixed. | [link](https://travelexx.com/hiking-indonesia-mount-merapi/) |
| sumbing | unique_selling_point | Second tallest non-volcanic peak complex in Central Java | Sumbing is an active stratovolcano (volcanic) | Fixed. | [link](https://en.wikipedia.org/wiki/Mount_Sumbing) |
| sumbing | ascent_time_hours | 8-10 | Garung route typically 6-8 h up, 4-5 h down (AllTrails: 9.5-10.5 h total) | Fixed. | [link](https://en.wikivoyage.org/wiki/Sindoro-Sumbing) |
| sindoro | elevation_m | 3153 | 3,150 m | Kept 3,153 m: 3 m difference. | [link](https://www.gunungbagging.com/sindoro/) |
| slamet | elevation_m | 3428 | 3,428 m in most sources; some list 3,432 m or 3,436 m | Kept 3,428 m: most sources agree with ours. | [link](https://www.gunungbagging.com/slamet/) |
| prau | elevation_m | 2590 | 2,565 m (Kompas and several guides) | Fixed. | [link](https://travel.kompas.com/read/2026/01/02/130916227/pendakian-gunung-prau-ditutup-mulai-19-januari-2026-hingga-maret-2026) |
| andong | elevation_m | 1726 | Sources vary: 1,463 m (Wikipedia summary), 1,737 m (peakery); 1,726 m is common in Indonesian hiking sources | Kept 1,726 m: the common figure in Indonesian sources. | [link](https://peakery.com/gunung-andong-indonesia-1737m/) |
| andong | basecamp_name | Basecamp Pendem / Sawit | Also a third basecamp/route: Dusun Gogik (Gugik), plus Temu Kidul route | Fixed. | [link](https://travel.kompas.com/read/2023/08/14/170705627/rute-ke-basecamp-gunung-andong-via-pendem-antara-jalur-sawit-dan-gogik) |
| telomoyo | basecamp_name | Basecamp Ngablak / Mendut | Sources name Dalangan (Magelang), Pagergedog (Semarang) and Arsal basecamps; Mendut not found as a Telomoyo basecamp | Fixed. | [link](https://visitjawatengah.jatengprov.go.id/en/destinations/mount-telomoyo-hike-via-arsal-basecamp) |
| telomoyo | trail_type | Pine forest; open grassland | A paved road runs nearly to the summit (motorbike/jeep access) | Fixed. | [link](https://timesindonesia.co.id/english/541182/no-hiking-boots-needed-explore-the-peak-of-mount-telomoyo-by-road) |
| sikunir | elevation_m | 2263 | Sources give 2,263 to 2,463 m for Sikunir; Sembungan village itself is ~2,350 m (above our viewpoint figure) | Fixed. | [link](https://visitjawatengah.jatengprov.go.id/en/regency/kabupaten-wonosobo/destinasi-wisata/bukit-sikunir) |
| sikunir | best_time_months | clearest May-October | Best time without fog: dry season July-October | Fixed. | [link](https://www.backindo.com/sikunir-dieng-sunrise/) |
| pangrango | ascent_time_hours | 10-12 (Gede-Pangrango traverse) | Direct Cibodas route: carpark (1,300 m) to summit 4.5 h, descent 3.5 h, about 9 h car to car (not the full traverse) | Fixed. | [link](https://www.gunungbagging.com/pangrango/) |
| papandayan | elevation_m | 2665 | 2,666 m (some travel sources); GVP and research papers give 2,665 m | Kept 2,665 m: GVP and research papers agree with ours. | [link](https://janitra-hendra.medium.com/mount-papandayan-the-death-forest-edelweiss-flower-field-and-the-crater-1f77690de87) |
| salak | best_time_months | May-September | Gunung Bagging says the park is closed entirely from December to March and in August | Fixed. | [link](https://www.gunungbagging.com/salak/) |
| salak | unique_selling_point | part of UNESCO biosphere reserve | Not verified in any source found | Fixed. |  |
| cikuray | ascent_time_hours | 6-8 | 5-6 hours from Pos Pemancar (1,510 m) | Fixed. | [link](https://www.gunungbagging.com/cikuray/) |
| guntur | access_status | conditional | BBKSDA Jabar: Guntur is a Cagar Alam and no climbing permits exist; circular SE-666 (27 Feb 2026) bans nature tourism in CA Gunung Guntur | Fixed. | [link](https://travel.kompas.com/read/2025/07/07/080800327/pendakian-gunung-guntur-via-citiis-tak-berizin-statusnya-cagar-alam) |
| guntur | key_hazards | occasional phreatic eruptions | Last confirmed eruption 1847; no recent phreatic eruptions found | Fixed. | [link](https://www.volcanodiscovery.com/guntur.html) |
| burangrang | ascent_time_hours | 4-5 | About 3-4 hours to the summit via Legok Haji | Fixed. | [link](https://www.rumah123.com/explore/kota-bandung/gunung-burangrang/) |
| sinabung | critical_points | Multiple eruptions 2010-2019 | Eruptive phases also from Aug 2020; new eruption 31 Aug 2026 with 3,500 m ash column, Level III | Fixed. | [link](https://en.wikipedia.org/wiki/Mount_Sinabung) |
| dempo | elevation_m | 3173 | 3,142 m (Wikipedia); PeakVisor agrees with 3,173 m | Kept 3,173 m: sources split (PeakVisor agrees with ours). | [link](https://en.wikipedia.org/wiki/Mount_Dempo) |
| dempo | basecamp_name | Basecamp Rimau / TVRI Relay Station | Trail reopened in May 2026 via the 'Kampung 4' route | Fixed. | [link](https://sumsel.antaranews.com/berita/819013/brigade-kembali-buka-jalur-pendakian-gunung-dempo) |
| agung | ascent_time_hours / route summit | 5-7 (Pasar Agung), implies summit | Pasar Agung route takes about 3-4 h and reaches the southern crater rim (2,907 m), not the main summit; Besakih route 6-7 h to the highest peak | Fixed. | [link](https://balijungletrekking.com/hiking-routes-of-mount-agung-bali-volcano/) |
| agung | elevation_m | 3031 | Same source gives the highest peak as 3,142 m via Besakih; Rough Guides gives 3,031 m | Kept 3,031 m: height after the 1963 eruption; 3,142 m is the pre-1963 figure. | [link](https://balijungletrekking.com/hiking-routes-of-mount-agung-bali-volcano/) |
| tambora | elevation_m | 2722 | 2,851 m after the 1815 eruption | Fixed. | [link](https://en.wikipedia.org/wiki/Mount_Tambora) |
| tambora | basecamp_name / ascent | Doro Mboha (Pancasila village) / Kawinda Toi; 10-14 h | Pancasila route: 16 km from Pancasila village (740 m) to the caldera, about 14 h with stops; 3-5 days round trip suggested | Fixed. | [link](https://en.wikipedia.org/wiki/Mount_Tambora) |
| tambora | access_status | open | Trails closed from 1 September 2026 for forest fire risk | Kept "open" as the permanent status; the Sept 2026 fire closure is a live advisory instead. | [link](https://en.antaranews.com/news/429433/indonesia-closes-mount-tambora-hiking-routes-over-forest-fire-threat) |
| inerie | ascent_time_hours | 5-7 | 3-5 h from Watumeze (Indonesia Kaya); about 4 h (The World Travel Guy) | Fixed. | [link](https://indonesiakaya.com/pustaka-indonesia/gunung-inerie-menengok-piramida-alam-di-pulau-flores/) |
| latimojong | elevation_m | 3478 | Estimates range 3,440-3,478 m; GPS data suggests the lower figure | Kept 3,478 m: within the cited 3,440-3,478 m range. | [link](https://www.gunungbagging.com/rantemario/) |
| lompobattang | elevation_m | 2871 | 2,874 m (triangulation point); official figures cited 2,874-2,886 m | Fixed. | [link](https://www.traveloka.com/id-id/explore/destination/pesona-keindahan-puncak-gunung-lompobattang-di-sulawesi-selatan/1008623) |
| lompobattang | basecamp_name | Basecamp via Malino area | Easiest route via Dusun Lembang Bune, Kelurahan Cikoro, Kec. Tompobulu, Kab. Gowa; mountain located in Kab. Bantaeng | Fixed. | [link](https://www.traveloka.com/id-id/explore/destination/pesona-keindahan-puncak-gunung-lompobattang-di-sulawesi-selatan/1008623) |
| bawakaraeng | elevation_m | 2845 | Several route guides give 2,830 m | Kept 2,845 m: only some route guides give 2,830 m. | [link](https://www.sekeluargahealing.com/2024/10/peta-dan-rute-pendakian-gunung.html) |

## Open items (found 2026-09-27 while sourcing summit coordinates)

Not changed. Sources still disagree, so these need a check against an official
figure (TN/BKSDA, PVMBG or a survey) before the CSV is edited.

| Mountain | Ours | Other source | Note |
|---|---|---|---|
| sikunir | 2,463 m | 2,258-2,263 m (PeakVisor) | The lower figure would put the hilltop below Sembungan village (~2,300 m), where the walk starts, so 2,463 m was kept. |
| andong | 1,726 m | 1,463 m (Wikipedia) | 1,726 m is the common figure in Indonesian hiking sources. |
| dempo | 3,173 m | 3,142 m (Wikipedia) | PeakVisor agrees with ours. |
| lemongan | 1,651 m | 1,641 m (Wikipedia) | |
| slamet | 3,428 m | 3,432 m (Wikipedia) | |
| ranti | 2,626 m | 2,601 m (id.wikipedia) | 2,626 m is Gunung Bagging's true summit. |
| pundak | 1,585 m | 1,553 m (PeakVisor) | |
| panderman | 2,045 m | 2,037 m (PeakVisor) | |
| merapi-ungup | 2,800 m | 2,769 m (Wikipedia) | |

Summit coordinates: 42 of 50 are sourced (`server/data/summit-coordinates.sources.json`).
Missing: Welirang, Panderman, Kawi, Anjasmoro, Wilis, Pundak, Ranti (no
cited coordinate for that specific peak) and Pangrango (the cited value lands on Gede).
