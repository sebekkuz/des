# Definicje domenowe

Ten dokument opisuje kluczowe metryki, jednostki i pojęcia używane w symulatorze linii produkcyjnych.

## Jednostki

- **Czas** – podstawowa jednostka to sekunda (`s`). Dozwolone są także minuty (`min`) i godziny (`h`), które są konwertowane na sekundy.
- **Długość** – metry (`m`) i milimetry (`mm`).
- **Prędkość** – metry na sekundę (`m/s`).

## Metryki i KPI

- **Throughput [szt/h]** – liczba produktów opuszczających system w jednostce czasu.
- **WIP** – Work In Process, średnia liczba produktów w systemie.
- **Cycle Time (CT)** – średni czas od wejścia do wyjścia produktu z systemu.
- **Waiting Time** – średni czas oczekiwania w kolejkach.
- **Utilization** – procentowy udział czasu pracy zasobu/stanowiska.
- **Scrap %** – odsetek produktów nie spełniających wymogów jakościowych.
- **OEE** – Overall Equipment Effectiveness, iloczyn składowych: A (dyspozycyjność), P (wydajność), Q (jakość).
- **Bottleneck** – identyfikacja stanowiska lub zasobu o najwyższym obciążeniu.

## Atrybuty części/produktów

System może śledzić dodatkowe atrybuty przekazywane wraz z jednostkami, np. numer partii, rodzaj produktu, liczbę reworków, czas w systemie itp.