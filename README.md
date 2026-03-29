SOA PROJEKAT 2026
Papp Tamás RA4-2022
Sofija Mihajlović RA10-2022
Dragana Kanazir RA11-2022
Stefan Paunović RA27-2022

/root
├── /frontend               # React-TS App
├── /backend
│   ├── /stakeholders-auth  # Java / Spring Boot (REST) [cite: 26, 76]
│   ├── /blog               # (Shared or separate service) [cite: 26, 76]
│   ├── /followers          # Go (Neo4j / Graph database) [cite: 41, 48]
│   ├── /tours              # .NET (PostgreSQL/Mongo) [cite: 76]
│   └── /api-gateway        # (e.g., KrakenD, Kong, or Go-based) [cite: 49]
├── /common
│   └── /protos             # .proto files for RPC communication [cite: 57]
├── docker-compose.yml      # Orchestrates all services [cite: 35, 53]
└── Makefile / scripts      # For building all services at once





Uloge u sistemu
● Administrator
● Vodič (kreator tura)
● Turista

Funkcionalni zahtevi
Predlog podele na mikroservise: Stakeholders servis, Auth servis, Blog servis, Purchase servis,
Followers servis, Tour servis.
Funkcionalni zahtevi - Prva KT
1. Neregistrovani korisnik može da se registruje i odabere ulogu Vodiča ili Turiste (admini
se ubaciju direktno u bazu). Nalog obuhvata: korisničko ime, lozinku, mejl, ulogu (vodič,
turista, administrator).
2. Admin može da pregleda sve naloge korisnika (ne treba da vidi lozinke).
3. Admin može da blokira naloge kreirane od strane korisnika.
4. Svaki korisnik (vodič, turista) može da pregleda svoj profil koji obuhvata: ime, prezime,
profilnu sliku, biografiju, moto (citat).
5. Korisnik može da menja informacije sa svog profila.
6. Korisnik može da kreira blog koji obuhvata: naslov (temu), opis, datum kreiranja, slike
(opciono). Za opis bloga treba obezbediti podršku za markdown jezik.
7. Korisnik može da ostavi komentar na blog koji obuhvata: informacije o korisniku koji je
kreirao objavu, vreme kreiranja, tekst, vreme poslednje izmene.
8. Korisnik može da lajkuje blog objavu. Svaki korisnik može da lajkuje objavu najviše
jednom, a može i da ukloni svoj lajk. Broj lajkova se prikazuje uz objavu.
Funkcionalni zahtevi - Druga KT
9. Korisnik može da zaprati druge korisnike (klikom na button follow), tek nakon što je
zapratio korisnika može da ostavi komentar na njegov blog (ova funkcionalnost je
detaljno opisana u uputstvu iznad za 2. KT).
10. Autor može da kreira turu tako što navodi naziv ture, opis, težinu i tagove koji opisuju
turu. Pri početnom kreiranju ture, tura treba da ima status draft i da joj je cena
postavljena na 0. Autor može da vidi sve svoje ture.
11. Autor navodi ključne tačke za turu tako što na mapi bira određenu lokaciju. Informacija o
geografskoj širini i dužini se beleži, zajedno sa nazivom, opisom i slikom (npr. ključna
tačka može biti neki muzej, park, spomenik).
12. Turista može da ostavi recenziju za određenu turu. Recenzija obuhvata: ocenu (1-5),
komentar, informacije o samom turisti koji je ostavio recenziju, datum kada je posetio
turu, datum kada je ostavio komentar i slike.
13. Omogućiti crtanje ture na mapi. Tura se na mapi crta na osnovu njenih ključnih tačaka.
Takođe, treba omogućiti kreiranje novih ključnih tačaka na mapi, kao i izmenu ili brisanje
postojećih. Proces kreiranja i izmene mora da obuhvati korak u kojem se selektuje
određena pozicija na mapi koja će predstavljati novu koordinatu određene ključne tačke.
14. Simulator pozicije je funkcionalnost koju koristimo u nedostatku mobilne aplikacije.
Turista otvara stranicu za simulator koja prikazuje mapu. Mapa iscrtava njegov trenutni
položaj ako ga je prethodno definisao. Turista može da klikne na mapu pri čemu
simulator beleži lokaciju kao trenutnu lokaciju turiste. Za trenutnu lokaciju se beleže lat i
long. Informaciju gde se turista nalazi će koristiti izvedba ture (TourExecution) definisana
dole.
Funkcionalni zahtevi - Treća KT
15. Tura ima tri osnovna stanja - draft, published i archived.
U momentu kada je Autor ture uneo osnovne podatke tura može da se kreira i tada je u
stanju draft. Upravljanje ključnim tačkama ture treba da bude integrisano u proces
kreiranja ture. Pri dodavanju svake ključne tačke posle prve, sistem treba da izračuna i
sačuva dužinu ture u kilometrima (uz pomoć mape).
Autor ture može objaviti prethodno kreiranu turu pod sledećim uslovima:
1. Tura sadrži osnovne podatke (naziv ture, opis, težinu i tagove)
2. Tura sadrži bar dve ključne tačke.
3. Definisano je bar jedno vreme potrebno da se obiđe tura u zavisnosti od prevoza
(npr. 120 min. peške, 45 min. biciklom). Tip prevoza je enumeracija koja uključuje
peške, bicikl i automobil.
Objava prebacuje turu u status objavljen i postavlja DateTime kada se objava desila.
Autor može da arhivira objavljene ture, gde sistem beleži vrem arhiviranja. Arhivirane
ture se mogu ponovo aktivirati. Turista može da vidi samo objavljene ture gde vidi
osnovne informacije i prvu ključnu tačku, ali ne vidi ostatak ture.
16. Turista može kupiti objavljenu turu tako što će je prvo smestiti u svoju korpu
(ShoppingCart). Svaka stavka (OrderItem) u korpi sadrži ime ture, cenu i id ture.
Korpa računa ukupnu cenu svih stavki u korpi prilikom dodavanja ili uklanjanja nečega iz
korpe. Kada je turista zadovoljan stanjem u korpi, ide na checkout i za svaku stavku iz
korpe dobija token (TourPurchaseToken) koji označava da je stavka kupljena.
Turista vidi samo deo informacija o turama dok ih ne kupi: opis, dužinu, vreme prolaska,
slike, početnu tačku i recenzije. Ture koje su kupljene otkrivaju sve ključne tačke.
Arhivirane ture se ne mogu kupiti.
17. Turista može pokrenuti turu, pri čemu se kreira sesija (TourExecution). Sesija se
završava kada turista završi (completed) ili napusti turu (abandoned). Tom prilikom se
evidentira vreme napuštanja/kompletiranja. Kada turista pokrene turu, beleži se lokacija
turiste (front-end prvo dobija lokaciju putem Position simulatora).
Na ekranu za aktivnu turu, front-end na svakih 10 sekundi šalje zahtev da se proveri da li
je turista blizu neke ključne tačke (Napomena: Prvo pita Position simulator gde se nalazi,
pa onda šalje novi zahtev na back). Ako jeste, u sesiji se beleži da je turista kompletirao
tu ključnu tačku i beleži se vreme kada je dostigao. Bez obzira na ishod, beleži se last
activity DateTime na nivou TourExecution objekta.
Turista može da pokrene objavljene i arhivirane ture. Kada se uvede kupovina,
preduslov za pokretanje ture je da je kupljena.