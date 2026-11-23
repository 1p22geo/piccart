# Piccart

Polski sklep demonstracyjny w Next.js z bazą SQLite. Klient może przeglądać produkty, złożyć zamówienie i sprawdzić jego historię. Administrator zarządza produktami i zapasami. Zamówienia są zapisywane lokalnie, bez pobierania płatności.

## Uruchomienie

Użyj Node.js 24. W folderze projektu wykonaj kolejno:

```sh
npm ci --legacy-peer-deps
npm run seed
npm run dev
```

Na Windows x64, jeśli npm próbuje kompilować moduł SQLite i zgłasza MSB8036, wykonaj pierwsze polecenie z opcją `--ignore-scripts`. Pakiet zawiera gotową bibliotekę dla tej platformy.

Otwórz http://localhost:3000. Konto demonstracyjne klienta to `shopper@piccart.test` z hasłem `Shopper-Docs-1`. Dane administratora pojawiają się w konsoli przy pierwszym uruchomieniu nowej bazy.

## Testy

- `npm test` uruchamia testy Jest.
- `npm run test:e2e` uruchamia scenariusze Playwright na oddzielnej bazie.
- `npm run verify` sprawdza typy, testy jednostkowe, kompilację produkcyjną, testy przeglądarkowe i eksport dokumentacji.

Playwright korzysta z Chromium zainstalowanego przez `npx playwright install chromium`. Aby skorzystać z systemowego Chrome w PowerShell, ustaw w tym samym terminalu `$env:PLAYWRIGHT_CHANNEL = 'chrome'`.

## Przewodnik

Otwórz [podręcznik HTML](docs/site/index.html) bezpośrednio z dysku. Po zmianach w interfejsie uruchom `npm run docs:screenshots`, następnie `npm run docs:build`. Zrzuty wykorzystują osobną bazę demonstracyjną. Eksport HTML zawiera wszystkie zrzuty i można go otworzyć offline jako pojedynczy plik.
