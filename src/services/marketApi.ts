import { StockQuote, ChartPoint, TimeRange, SearchResult } from '../types/market';

export interface CatalogItem {
  symbol: string;
  name: string;
  sector: string;
  category: string;
}

const RAW_SYMBOLS: CatalogItem[] = [
  // ==========================================
  // --- 1. BIG TECH, IA & SEMICONDUCTORES ---
  // ==========================================
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductores & IA', category: 'TECH' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Tecnología & Hardware', category: 'TECH' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Software & Cloud', category: 'TECH' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', sector: 'Internet & Cloud', category: 'TECH' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Comercio & Cloud', category: 'TECH' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', sector: 'Redes Sociales & VR', category: 'TECH' },
  { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', sector: 'Semiconductores', category: 'TECH' },
  { symbol: 'PLTR', name: 'Palantir Technologies Inc.', sector: 'Software IA & Datos', category: 'TECH' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Semiconductores', category: 'TECH' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing', sector: 'Fundición de Chips', category: 'TECH' },
  { symbol: 'ARM', name: 'Arm Holdings plc', sector: 'Arquitectura de Chips', category: 'TECH' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Semiconductores & Redes', category: 'TECH' },
  { symbol: 'QCOM', name: 'QUALCOMM Incorporated', sector: 'Chips Móviles & 5G', category: 'TECH' },
  { symbol: 'ASML', name: 'ASML Holding N.V.', sector: 'Litografía de Chips', category: 'TECH' },
  { symbol: 'MU', name: 'Micron Technology, Inc.', sector: 'Memorias & Chips', category: 'TECH' },
  { symbol: 'TXN', name: 'Texas Instruments Incorporated', sector: 'Semiconductores Analógicos', category: 'TECH' },
  { symbol: 'ADI', name: 'Analog Devices, Inc.', sector: 'Semiconductores', category: 'TECH' },
  { symbol: 'MRVL', name: 'Marvell Technology, Inc.', sector: 'Chips de Datos & IA', category: 'TECH' },
  { symbol: 'LRCX', name: 'Lam Research Corporation', sector: 'Equipamiento Chips', category: 'TECH' },
  { symbol: 'KLAC', name: 'KLA Corporation', sector: 'Inspección de Chips', category: 'TECH' },
  { symbol: 'AMAT', name: 'Applied Materials, Inc.', sector: 'Materiales & Chips', category: 'TECH' },
  { symbol: 'NXPI', name: 'NXP Semiconductors N.V.', sector: 'Chips Automotrices', category: 'TECH' },
  { symbol: 'ON', name: 'ON Semiconductor Corporation', sector: 'Semiconductores', category: 'TECH' },
  { symbol: 'STM', name: 'STMicroelectronics N.V.', sector: 'Semiconductores Europa', category: 'TECH' },
  { symbol: 'IFX.DE', name: 'Infineon Technologies AG', sector: 'Chips & Automoción', category: 'TECH' },
  { symbol: 'SMCI', name: 'Super Micro Computer, Inc.', sector: 'Servidores IA', category: 'TECH' },
  { symbol: 'DELL', name: 'Dell Technologies Inc.', sector: 'Hardware & Servidores', category: 'TECH' },
  { symbol: 'HPQ', name: 'HP Inc.', sector: 'PCs & Impresoras', category: 'TECH' },
  { symbol: 'HPE', name: 'Hewlett Packard Enterprise', sector: 'Servidores & Edge', category: 'TECH' },
  { symbol: 'WDC', name: 'Western Digital Corporation', sector: 'Almacenamiento & SSD', category: 'TECH' },
  { symbol: 'STX', name: 'Seagate Technology Holdings', sector: 'Discos Duros & Cloud', category: 'TECH' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', sector: 'Software CRM & Cloud', category: 'TECH' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Software Creativo & IA', category: 'TECH' },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Base de Datos & Cloud', category: 'TECH' },
  { symbol: 'SAP', name: 'SAP SE', sector: 'Software Empresarial', category: 'TECH' },
  { symbol: 'IBM', name: 'International Business Machines', sector: 'Computación & IA', category: 'TECH' },
  { symbol: 'NOW', name: 'ServiceNow, Inc.', sector: 'Automatización Cloud', category: 'TECH' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', sector: 'Data Cloud & IA', category: 'TECH' },
  { symbol: 'WDAY', name: 'Workday, Inc.', sector: 'Software RRHH & Finanzas', category: 'TECH' },
  { symbol: 'INTU', name: 'Intuit Inc.', sector: 'Software Financiero', category: 'TECH' },
  { symbol: 'TEAM', name: 'Atlassian Corporation', sector: 'Software de Equipos', category: 'TECH' },
  { symbol: 'MDB', name: 'MongoDB, Inc.', sector: 'Bases de Datos Modernas', category: 'TECH' },
  { symbol: 'DDOG', name: 'Datadog, Inc.', sector: 'Monitorización Cloud', category: 'TECH' },
  { symbol: 'NET', name: 'Cloudflare, Inc.', sector: 'Seguridad Web & CDN', category: 'TECH' },
  { symbol: 'PATH', name: 'UiPath Inc.', sector: 'Automatización Robótica (RPA)', category: 'TECH' },
  { symbol: 'PANW', name: 'Palo Alto Networks, Inc.', sector: 'Ciberseguridad', category: 'TECH' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings, Inc.', sector: 'Ciberseguridad Endpoint', category: 'TECH' },
  { symbol: 'FTNT', name: 'Fortinet, Inc.', sector: 'Ciberseguridad & Firewalls', category: 'TECH' },
  { symbol: 'ZS', name: 'Zscaler, Inc.', sector: 'Seguridad Zero Trust', category: 'TECH' },
  { symbol: 'OKTA', name: 'Okta, Inc.', sector: 'Gestión de Identidades', category: 'TECH' },
  { symbol: 'S', name: 'SentinelOne, Inc.', sector: 'Ciberseguridad IA', category: 'TECH' },
  { symbol: 'CYBR', name: 'CyberArk Software Ltd.', sector: 'Seguridad de Accesos', category: 'TECH' },
  { symbol: 'BABA', name: 'Alibaba Group Holding Limited', sector: 'E-Commerce & Cloud Asia', category: 'TECH' },
  { symbol: 'JD', name: 'JD.com, Inc.', sector: 'E-Commerce Asia', category: 'TECH' },
  { symbol: 'BIDU', name: 'Baidu, Inc.', sector: 'Buscador & IA Asia', category: 'TECH' },

  // ==========================================
  // --- 2. CONSUMO, MODA, LUJO & RETAIL ---
  // ==========================================
  { symbol: 'MC.PA', name: 'LVMH Moët Hennessy Louis Vuitton', sector: 'Moda & Lujo Global', category: 'CONSUMER' },
  { symbol: 'KER.PA', name: 'Kering SA (Gucci, Balenciaga)', sector: 'Moda de Lujo', category: 'CONSUMER' },
  { symbol: 'RMS.PA', name: 'Hermès International SCA', sector: 'Alta Costura & Lujo', category: 'CONSUMER' },
  { symbol: 'OR.PA', name: "L'Oréal S.A.", sector: 'Cosmética & Belleza', category: 'CONSUMER' },
  { symbol: 'CFR.SW', name: 'Compagnie Financière Richemont (Cartier)', sector: 'Joyería & Relojes', category: 'CONSUMER' },
  { symbol: 'MONC.MI', name: 'Moncler S.p.A.', sector: 'Moda de Lujo', category: 'CONSUMER' },
  { symbol: 'PRDSY', name: 'Prada S.p.A.', sector: 'Moda & Accesorios', category: 'CONSUMER' },
  { symbol: 'BRBY.L', name: 'Burberry Group plc', sector: 'Moda Británica', category: 'CONSUMER' },
  { symbol: 'SFER.MI', name: 'Salvatore Ferragamo S.p.A.', sector: 'Calzado & Moda Lujo', category: 'CONSUMER' },
  { symbol: 'BC.MI', name: 'Brunello Cucinelli S.p.A.', sector: 'Moda & Cashmere', category: 'CONSUMER' },
  { symbol: 'ITX.MC', name: 'Inditex (Zara, Bershka, Pull&Bear)', sector: 'Moda Retail Global', category: 'CONSUMER' },
  { symbol: 'NKE', name: 'Nike, Inc.', sector: 'Moda Deportiva', category: 'CONSUMER' },
  { symbol: 'ADS.DE', name: 'Adidas AG', sector: 'Moda Deportiva', category: 'CONSUMER' },
  { symbol: 'PUM.DE', name: 'Puma SE', sector: 'Moda Deportiva', category: 'CONSUMER' },
  { symbol: 'LULU', name: 'Lululemon Athletica Inc.', sector: 'Ropa Deportiva Premium', category: 'CONSUMER' },
  { symbol: 'ONON', name: 'On Holding AG (On Running)', sector: 'Calzado Deportivo', category: 'CONSUMER' },
  { symbol: 'DECK', name: 'Deckers Outdoor (Hoka, UGG)', sector: 'Calzado & Botas', category: 'CONSUMER' },
  { symbol: 'SKX', name: 'Skechers U.S.A., Inc.', sector: 'Calzado Cómodo', category: 'CONSUMER' },
  { symbol: 'CROX', name: 'Crocs, Inc.', sector: 'Calzado Casual', category: 'CONSUMER' },
  { symbol: 'LEVI', name: 'Levi Strauss & Co.', sector: 'Ropa Vaquera / Jeans', category: 'CONSUMER' },
  { symbol: 'RL', name: 'Ralph Lauren Corporation', sector: 'Moda Clásica', category: 'CONSUMER' },
  { symbol: 'CPRI', name: 'Capri Holdings (Versace, Michael Kors)', sector: 'Moda de Lujo', category: 'CONSUMER' },
  { symbol: 'TPR', name: 'Tapestry, Inc. (Coach, Kate Spade)', sector: 'Bolsos & Lujo Accesible', category: 'CONSUMER' },
  { symbol: 'HMB.ST', name: 'H & M Hennes & Mauritz AB', sector: 'Moda Rápida', category: 'CONSUMER' },
  { symbol: 'ZAL.DE', name: 'Zalando SE', sector: 'E-Commerce de Moda', category: 'CONSUMER' },
  { symbol: 'UAA', name: 'Under Armour, Inc.', sector: 'Ropa Deportiva', category: 'CONSUMER' },
  { symbol: 'MCD', name: "McDonald's Corporation", sector: 'Comida Rápida Global', category: 'CONSUMER' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Cafeterías & Bebidas', category: 'CONSUMER' },
  { symbol: 'QSR', name: 'Restaurant Brands (Burger King, Popeyes)', sector: 'Restauración Rápida', category: 'CONSUMER' },
  { symbol: 'YUM', name: 'Yum! Brands (KFC, Pizza Hut, Taco Bell)', sector: 'Restauración Rápida', category: 'CONSUMER' },
  { symbol: 'CMG', name: 'Chipotle Mexican Grill, Inc.', sector: 'Comida Mexicana Rápida', category: 'CONSUMER' },
  { symbol: 'DPZ', name: "Domino's Pizza, Inc.", sector: 'Pizzerías & Delivery', category: 'CONSUMER' },
  { symbol: 'WEN', name: "The Wendy's Company", sector: 'Comida Rápida', category: 'CONSUMER' },
  { symbol: 'SHAK', name: 'Shake Shack Inc.', sector: 'Hamburguesas Gourmet', category: 'CONSUMER' },
  { symbol: 'DRI', name: 'Darden Restaurants (Olive Garden)', sector: 'Restaurantes', category: 'CONSUMER' },
  { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Bebidas No Alcohólicas', category: 'CONSUMER' },
  { symbol: 'PEP', name: 'PepsiCo, Inc.', sector: 'Bebidas & Snacks', category: 'CONSUMER' },
  { symbol: 'MNST', name: 'Monster Beverage Corporation', sector: 'Bebidas Energéticas', category: 'CONSUMER' },
  { symbol: 'CELH', name: 'Celsius Holdings, Inc.', sector: 'Bebidas Fitness', category: 'CONSUMER' },
  { symbol: 'KDP', name: 'Keurig Dr Pepper Inc.', sector: 'Café & Refrescos', category: 'CONSUMER' },
  { symbol: 'NESN.SW', name: 'Nestlé S.A.', sector: 'Alimentación & Café', category: 'CONSUMER' },
  { symbol: 'MDLZ', name: 'Mondelez International (Oreo, Milka)', sector: 'Snacks & Chocolate', category: 'CONSUMER' },
  { symbol: 'HSY', name: 'The Hershey Company', sector: 'Chocolates & Dulces', category: 'CONSUMER' },
  { symbol: 'K', name: 'Kellanova (Kellogg’s, Pringles)', sector: 'Cereales & Snacks', category: 'CONSUMER' },
  { symbol: 'KHC', name: 'The Kraft Heinz Company', sector: 'Salsas & Alimentación', category: 'CONSUMER' },
  { symbol: 'GIS', name: 'General Mills, Inc.', sector: 'Alimentación & Yogures', category: 'CONSUMER' },
  { symbol: 'DEO', name: 'Diageo plc (Johnnie Walker, Smirnoff)', sector: 'Bebidas Espirituosas', category: 'CONSUMER' },
  { symbol: 'HEINY', name: 'Heineken N.V.', sector: 'Cervezas', category: 'CONSUMER' },
  { symbol: 'BUD', name: 'Anheuser-Busch InBev (Corona, Budweiser)', sector: 'Cervezas Globales', category: 'CONSUMER' },
  { symbol: 'CCEP', name: 'Coca-Cola Europacific Partners', sector: 'Embotelladora Coca-Cola', category: 'CONSUMER' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', sector: 'Club de Compras & Super', category: 'CONSUMER' },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Supermercados & Retail', category: 'CONSUMER' },
  { symbol: 'TGT', name: 'Target Corporation', sector: 'Grandes Almacenes', category: 'CONSUMER' },
  { symbol: 'PG', name: 'The Procter & Gamble Company', sector: 'Higiene & Hogar', category: 'CONSUMER' },
  { symbol: 'UL', name: 'Unilever PLC (Dove, Axe, Knorr)', sector: 'Cuidado Personal & Hogar', category: 'CONSUMER' },
  { symbol: 'CL', name: 'Colgate-Palmolive Company', sector: 'Cuidado Dental & Hogar', category: 'CONSUMER' },
  { symbol: 'EL', name: 'The Estée Lauder Companies', sector: 'Cosméticos & Perfumes', category: 'CONSUMER' },
  { symbol: 'KMB', name: 'Kimberly-Clark Corporation (Huggies)', sector: 'Productos de Papel', category: 'CONSUMER' },
  { symbol: 'CA.PA', name: 'Carrefour SA', sector: 'Supermercados Europa', category: 'CONSUMER' },
  { symbol: 'TSCO.L', name: 'Tesco PLC', sector: 'Supermercados Reino Unido', category: 'CONSUMER' },
  { symbol: 'AD.AS', name: 'Koninklijke Ahold Delhaize N.V.', sector: 'Supermercados', category: 'CONSUMER' },
  { symbol: 'DIA.MC', name: 'Distribuidora Internacional de Alimentación', sector: 'Supermercados España', category: 'CONSUMER' },
  { symbol: 'ABNB', name: 'Airbnb, Inc.', sector: 'Alojamientos & Vacaciones', category: 'CONSUMER' },
  { symbol: 'BKNG', name: 'Booking Holdings Inc.', sector: 'Viajes & Hoteles Online', category: 'CONSUMER' },
  { symbol: 'EXPE', name: 'Expedia Group, Inc.', sector: 'Viajes & Vuelos', category: 'CONSUMER' },
  { symbol: 'UBER', name: 'Uber Technologies, Inc.', sector: 'Transporte & Delivery', category: 'CONSUMER' },
  { symbol: 'DASH', name: 'DoorDash, Inc.', sector: 'Comida a Domicilio', category: 'CONSUMER' },
  { symbol: 'MAR', name: 'Marriott International, Inc.', sector: 'Hoteles & Resorts', category: 'CONSUMER' },
  { symbol: 'HLT', name: 'Hilton Worldwide Holdings Inc.', sector: 'Hoteles Globales', category: 'CONSUMER' },
  { symbol: 'RCL', name: 'Royal Caribbean Cruises Ltd.', sector: 'Cruceros de Placer', category: 'CONSUMER' },
  { symbol: 'CCL', name: 'Carnival Corporation & plc', sector: 'Cruceros', category: 'CONSUMER' },

  // ==========================================
  // --- 3. VIDEOJUEGOS & GAMING ---
  // ==========================================
  { symbol: 'TTWO', name: 'Take-Two Interactive (Rockstar / GTA)', sector: 'Videojuegos & GTA', category: 'GAMING' },
  { symbol: 'EA', name: 'Electronic Arts Inc. (EA Sports FC)', sector: 'Videojuegos Deportivos', category: 'GAMING' },
  { symbol: 'UBI.PA', name: 'Ubisoft Entertainment SA (Assassin’s Creed)', sector: 'Videojuegos Acción', category: 'GAMING' },
  { symbol: 'RBLX', name: 'Roblox Corporation', sector: 'Metaverso & Juegos', category: 'GAMING' },
  { symbol: 'SONY', name: 'Sony Group (PlayStation)', sector: 'Consolas & PlayStation', category: 'GAMING' },
  { symbol: 'NTDOY', name: 'Nintendo Co., Ltd. (Switch / Mario / Zelda)', sector: 'Consolas & Videojuegos', category: 'GAMING' },
  { symbol: 'CDR.WA', name: 'CD Projekt S.A. (The Witcher / Cyberpunk)', sector: 'Videojuegos RPG', category: 'GAMING' },
  { symbol: 'U', name: 'Unity Software Inc.', sector: 'Motor de Videojuegos', category: 'GAMING' },
  { symbol: 'CCOEY', name: 'Capcom Co., Ltd. (Resident Evil, Monster Hunter)', sector: 'Videojuegos Acción', category: 'GAMING' },
  { symbol: 'SGAMY', name: 'Sega Sammy Holdings (Sonic the Hedgehog)', sector: 'Videojuegos & Arcades', category: 'GAMING' },
  { symbol: 'KNAMF', name: 'Konami Group (Silent Hill, Metal Gear, eFootball)', sector: 'Videojuegos & Entretenimiento', category: 'GAMING' },
  { symbol: 'SQNXF', name: 'Square Enix (Final Fantasy, Dragon Quest)', sector: 'Videojuegos RPG', category: 'GAMING' },
  { symbol: 'BNXPF', name: 'Bandai Namco (Elden Ring, Tekken, Dragon Ball)', sector: 'Videojuegos & Anime', category: 'GAMING' },
  { symbol: 'TKOMY', name: 'Koei Tecmo Holdings (Ninja Gaiden, Dynasty)', sector: 'Videojuegos', category: 'GAMING' },
  { symbol: 'EMBRAC-B.ST', name: 'Embracer Group AB (Tomb Raider)', sector: 'Desarrollo de Videojuegos', category: 'GAMING' },
  { symbol: 'PDX.ST', name: 'Paradox Interactive AB (Crusader Kings)', sector: 'Juegos de Estrategia', category: 'GAMING' },
  { symbol: 'REMEDY.HE', name: 'Remedy Entertainment (Alan Wake, Control)', sector: 'Videojuegos Narrativos', category: 'GAMING' },
  { symbol: '11B.WA', name: '11 bit studios (Frostpunk, This War of Mine)', sector: 'Videojuegos Indie / Survival', category: 'GAMING' },
  { symbol: 'TCEHY', name: 'Tencent Holdings (Riot Games / LoL / Epic Games)', sector: 'Videojuegos & Cloud Asia', category: 'GAMING' },
  { symbol: 'NTES', name: 'NetEase, Inc.', sector: 'Videojuegos Online & MMO', category: 'GAMING' },
  { symbol: '259960.KS', name: 'Krafton, Inc. (PUBG: Battlegrounds)', sector: 'Battle Royale & Shooters', category: 'GAMING' },
  { symbol: '036570.KS', name: 'NCSoft Corporation (Lineage)', sector: 'Juegos MMORPG', category: 'GAMING' },
  { symbol: 'SE', name: 'Sea Limited (Garena Free Fire)', sector: 'Videojuegos Móviles', category: 'GAMING' },
  { symbol: 'BILI', name: 'Bilibili Inc.', sector: 'Gaming & Streaming Anime', category: 'GAMING' },
  { symbol: 'CRSR', name: 'Corsair Gaming, Inc.', sector: 'Periféricos & Hardware PC', category: 'GAMING' },
  { symbol: 'LOGI', name: 'Logitech International S.A.', sector: 'Periféricos & Ratones', category: 'GAMING' },
  { symbol: 'HEAR', name: 'Turtle Beach Corporation', sector: 'Auriculares Gaming', category: 'GAMING' },
  { symbol: 'APP', name: 'AppLovin Corporation', sector: 'Monetización & Juegos', category: 'GAMING' },
  { symbol: 'PLTK', name: 'Playtika Holding Corp.', sector: 'Juegos Sociales Móviles', category: 'GAMING' },

  // ==========================================
  // --- 4. CRIPTOMONEDAS ---
  // ==========================================
  { symbol: 'BTC-USD', name: 'Bitcoin (USD)', sector: 'Criptomoneda Líder', category: 'CRYPTO' },
  { symbol: 'ETH-USD', name: 'Ethereum (USD)', sector: 'Smart Contracts', category: 'CRYPTO' },
  { symbol: 'SOL-USD', name: 'Solana (USD)', sector: 'Blockchain Alta Velocidad', category: 'CRYPTO' },
  { symbol: 'BNB-USD', name: 'Binance Coin (USD)', sector: 'Ecosistema Binance', category: 'CRYPTO' },
  { symbol: 'XRP-USD', name: 'Ripple XRP (USD)', sector: 'Pagos Bancarios Cripto', category: 'CRYPTO' },
  { symbol: 'DOGE-USD', name: 'Dogecoin (USD)', sector: 'Memecoin de Red', category: 'CRYPTO' },
  { symbol: 'ADA-USD', name: 'Cardano (USD)', sector: 'Blockchain Proof-of-Stake', category: 'CRYPTO' },
  { symbol: 'AVAX-USD', name: 'Avalanche (USD)', sector: 'Smart Contracts DeFi', category: 'CRYPTO' },
  { symbol: 'LINK-USD', name: 'Chainlink (USD)', sector: 'Oráculos Descentralizados', category: 'CRYPTO' },
  { symbol: 'DOT-USD', name: 'Polkadot (USD)', sector: 'Interoperabilidad Web3', category: 'CRYPTO' },
  { symbol: 'NEAR-USD', name: 'NEAR Protocol (USD)', sector: 'Blockchain Escalable', category: 'CRYPTO' },
  { symbol: 'SUI-USD', name: 'Sui Network (USD)', sector: 'Blockchain Move', category: 'CRYPTO' },
  { symbol: 'SHIB-USD', name: 'Shiba Inu (USD)', sector: 'Token Comunitario', category: 'CRYPTO' },
  { symbol: 'COIN', name: 'Coinbase Global, Inc.', sector: 'Exchange de Criptomonedas', category: 'CRYPTO' },
  { symbol: 'MSTR', name: 'MicroStrategy Incorporated', sector: 'Tesorería Bitcoin', category: 'CRYPTO' },
  { symbol: 'MARA', name: 'MARA Holdings, Inc.', sector: 'Minería de Bitcoin', category: 'CRYPTO' },

  // ==========================================
  // --- 5. AUTOMOTRIZ & MOVILIDAD ---
  // ==========================================
  { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'Vehículos Eléctricos & IA', category: 'AUTO' },
  { symbol: 'RACE', name: 'Ferrari N.V.', sector: 'Superdeportivos de Lujo', category: 'AUTO' },
  { symbol: 'P911.DE', name: 'Dr. Ing. h.c. F. Porsche AG', sector: 'Deportivos de Alta Gama', category: 'AUTO' },
  { symbol: 'PAH3.DE', name: 'Porsche Automobil Holding SE', sector: 'Holding Automovilístico', category: 'AUTO' },
  { symbol: 'AML.L', name: 'Aston Martin Lagonda Global', sector: 'Superdeportivos Británicos', category: 'AUTO' },
  { symbol: 'BMW3.DE', name: 'Bayerische Motoren Werke AG (BMW)', sector: 'Automóviles Premium', category: 'AUTO' },
  { symbol: 'MBG.DE', name: 'Mercedes-Benz Group AG', sector: 'Automóviles de Lujo', category: 'AUTO' },
  { symbol: 'VOW3.DE', name: 'Volkswagen AG (Audi, Cupra, Seat)', sector: 'Grupo Automotriz', category: 'AUTO' },
  { symbol: 'STLA', name: 'Stellantis N.V. (Peugeot, Fiat, Jeep)', sector: 'Grupo Automotriz Global', category: 'AUTO' },
  { symbol: 'RNO.PA', name: 'Renault SA (Alpine, Dacia)', sector: 'Automóviles', category: 'AUTO' },
  { symbol: 'VOLV-B.ST', name: 'AB Volvo (Camiones & Motores)', sector: 'Vehículos Comerciales', category: 'AUTO' },
  { symbol: 'F', name: 'Ford Motor Company', sector: 'Automóviles & Pickups', category: 'AUTO' },
  { symbol: 'GM', name: 'General Motors (Chevrolet, Cadillac)', sector: 'Automóviles', category: 'AUTO' },
  { symbol: 'RIVN', name: 'Rivian Automotive, Inc.', sector: 'Pickups Eléctricas', category: 'AUTO' },
  { symbol: 'LCID', name: 'Lucid Group, Inc.', sector: 'Sedanes Eléctricos Lujo', category: 'AUTO' },
  { symbol: 'TM', name: 'Toyota Motor Corporation', sector: 'Automóviles Híbridos', category: 'AUTO' },
  { symbol: 'HMC', name: 'Honda Motor Co., Ltd.', sector: 'Automóviles & Motos', category: 'AUTO' },
  { symbol: '7201.T', name: 'Nissan Motor Co., Ltd.', sector: 'Automóviles', category: 'AUTO' },
  { symbol: '7270.T', name: 'Subaru Corporation', sector: 'Automóviles Tracción Total', category: 'AUTO' },
  { symbol: '7269.T', name: 'Suzuki Motor Corporation', sector: 'Automóviles Compactos', category: 'AUTO' },
  { symbol: '7261.T', name: 'Mazda Motor Corporation', sector: 'Automóviles', category: 'AUTO' },
  { symbol: 'HYMTF', name: 'Hyundai Motor Company', sector: 'Automóviles Globales', category: 'AUTO' },
  { symbol: '000270.KS', name: 'Kia Corporation', sector: 'Automóviles & SUVs', category: 'AUTO' },
  { symbol: 'BYDDY', name: 'BYD Company Limited', sector: 'Vehículos Eléctricos & Baterías', category: 'AUTO' },
  { symbol: 'NIO', name: 'NIO Inc.', sector: 'Coches Eléctricos Inteligentes', category: 'AUTO' },
  { symbol: 'LI', name: 'Li Auto Inc.', sector: 'SUVs Híbridos Eléctricos', category: 'AUTO' },
  { symbol: 'XPEV', name: 'XPENG Inc.', sector: 'Coches Eléctricos Autónomos', category: 'AUTO' },
  { symbol: 'QS', name: 'QuantumScape Corporation', sector: 'Baterías Estado Sólido', category: 'AUTO' },
  { symbol: 'CHPT', name: 'ChargePoint Holdings, Inc.', sector: 'Estaciones de Carga Eléctrica', category: 'AUTO' },
  { symbol: 'BLNK', name: 'Blink Charging Co.', sector: 'Red de Carga Eléctrica', category: 'AUTO' },
  { symbol: 'CON.DE', name: 'Continental AG', sector: 'Neumáticos & Autopartes', category: 'AUTO' },
  { symbol: 'PRY.MI', name: 'Pirelli & C. S.p.A.', sector: 'Neumáticos de Competición / F1', category: 'AUTO' },
  { symbol: 'HOG', name: 'Harley-Davidson, Inc.', sector: 'Motocicletas Clásicas', category: 'AUTO' },
  { symbol: 'POL', name: 'Polaris Inc.', sector: 'Vehículos Todoterreno & Quads', category: 'AUTO' },
  { symbol: 'PIA.MI', name: 'Piaggio & C. SpA (Vespa, Aprilia)', sector: 'Motos & Scooters', category: 'AUTO' },

  // ==========================================
  // --- 6. STREAMING, CINE & MEDIOS ---
  // ==========================================
  { symbol: 'NFLX', name: 'Netflix, Inc.', sector: 'Streaming de Películas & Series', category: 'MEDIA' },
  { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Parques, Cine & Disney+', category: 'MEDIA' },
  { symbol: 'SPOT', name: 'Spotify Technology S.A.', sector: 'Streaming de Música & Podcasts', category: 'MEDIA' },
  { symbol: 'WBD', name: 'Warner Bros. Discovery (Max / HBO)', sector: 'Cine & Entretenimiento', category: 'MEDIA' },
  { symbol: 'PARA', name: 'Paramount Global', sector: 'Cine, TV & Paramount+', category: 'MEDIA' },
  { symbol: 'CMCSA', name: 'Comcast Corporation (Universal Studios)', sector: 'Medios, Cine & Parques', category: 'MEDIA' },
  { symbol: 'TEF.MC', name: 'Telefónica S.A. (Movistar)', sector: 'Telecomunicaciones & Fibra', category: 'MEDIA' },
  { symbol: 'T', name: 'AT&T Inc.', sector: 'Telecomunicaciones 5G', category: 'MEDIA' },
  { symbol: 'VZ', name: 'Verizon Communications Inc.', sector: 'Redes de Telecomunicación', category: 'MEDIA' },
  { symbol: 'ROKU', name: 'Roku, Inc.', sector: 'Plataforma de Streaming TV', category: 'MEDIA' },

  // ==========================================
  // --- 7. BANCA, FINANZAS & PAGOS ---
  // ==========================================
  { symbol: 'SAN.MC', name: 'Banco Santander S.A.', sector: 'Banca Internacional', category: 'BANKING' },
  { symbol: 'BBVA.MC', name: 'BBVA S.A.', sector: 'Banca Global', category: 'BANKING' },
  { symbol: 'CABK.MC', name: 'CaixaBank S.A.', sector: 'Banca Española', category: 'BANKING' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Banca Internacional', category: 'BANKING' },
  { symbol: 'BAC', name: 'Bank of America Corporation', sector: 'Banca Comercial', category: 'BANKING' },
  { symbol: 'GS', name: 'The Goldman Sachs Group, Inc.', sector: 'Banca de Inversión', category: 'BANKING' },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Banca de Inversión & Patrimonio', category: 'BANKING' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Redes de Pago Globales', category: 'BANKING' },
  { symbol: 'MA', name: 'Mastercard Incorporated', sector: 'Redes de Pago Globales', category: 'BANKING' },
  { symbol: 'PYPL', name: 'PayPal Holdings, Inc.', sector: 'Pagos Digitales & Billeteras', category: 'BANKING' },
  { symbol: 'AXP', name: 'American Express Company', sector: 'Tarjetas Premium & Finanzas', category: 'BANKING' },
  { symbol: 'BLK', name: 'BlackRock, Inc.', sector: 'Gestor de Activos Líder', category: 'BANKING' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', sector: 'Conglomerado Financiero', category: 'BANKING' },

  // ==========================================
  // --- 8. ENERGÍA & AEROESPACIAL ---
  // ==========================================
  { symbol: 'REP.MC', name: 'Repsol S.A.', sector: 'Petróleo & Energía', category: 'ENERGY' },
  { symbol: 'IBE.MC', name: 'Iberdrola S.A.', sector: 'Energía Renovable Líder', category: 'ENERGY' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Petróleo & Gas', category: 'ENERGY' },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Petróleo & Gas', category: 'ENERGY' },
  { symbol: 'SHEL', name: 'Shell plc', sector: 'Petróleo & Gas', category: 'ENERGY' },
  { symbol: 'TTE', name: 'TotalEnergies SE', sector: 'Energía & Combustibles', category: 'ENERGY' },
  { symbol: 'BA', name: 'The Boeing Company', sector: 'Aviones & Aeroespacial', category: 'ENERGY' },
  { symbol: 'AIR.PA', name: 'Airbus SE', sector: 'Aeronáutica & Defensa', category: 'ENERGY' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Maquinaria Pesada & Minería', category: 'ENERGY' },
  { symbol: 'LMT', name: 'Lockheed Martin Corporation', sector: 'Defensa & Cazas Militares', category: 'ENERGY' },

  // ==========================================
  // --- 9. ÍNDICES & ETFS GLOBALES ---
  // ==========================================
  { symbol: '^IBEX', name: 'IBEX 35 (Bolsa Española)', sector: 'Índice España', category: 'INDICES' },
  { symbol: '^GSPC', name: 'S&P 500 (Top 500 Empresas EE.UU.)', sector: 'Índice EE.UU.', category: 'INDICES' },
  { symbol: '^IXIC', name: 'NASDAQ Composite (Tecnología Global)', sector: 'Índice Nasdaq', category: 'INDICES' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average (30 Gigantes)', sector: 'Índice Dow Jones', category: 'INDICES' },
  { symbol: '^STOXX50E', name: 'EURO STOXX 50 (Top 50 Europa)', sector: 'Índice Europa', category: 'INDICES' },
  { symbol: '^GDAXI', name: 'DAX 40 (Bolsa Alemana)', sector: 'Índice Alemania', category: 'INDICES' },
  { symbol: '^N225', name: 'Nikkei 225 (Bolsa de Tokio)', sector: 'Índice Japón', category: 'INDICES' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'ETF S&P 500', category: 'INDICES' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', sector: 'ETF Nasdaq 100', category: 'INDICES' },
  { symbol: 'GLD', name: 'SPDR Gold Shares (Oro Físico)', sector: 'ETF Oro', category: 'INDICES' },
  { symbol: 'SLV', name: 'iShares Silver Trust (Plata Físico)', sector: 'ETF Plata', category: 'INDICES' },
  { symbol: 'USO', name: 'United States Oil Fund (Petróleo WTI)', sector: 'ETF Petróleo', category: 'INDICES' },
  { symbol: 'UNG', name: 'United States Natural Gas Fund (Gas Natural)', sector: 'ETF Gas Natural', category: 'INDICES' },
  { symbol: 'SMH', name: 'VanEck Semiconductor ETF (Chips & IA)', sector: 'ETF Semiconductores', category: 'INDICES' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF (Tecnología Disruptiva)', sector: 'ETF Innovación', category: 'INDICES' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond (Bonos EE.UU.)', sector: 'ETF Bonos Soberanos', category: 'INDICES' },
  { symbol: 'EEM', name: 'iShares MSCI Emerging Markets (Emergentes)', sector: 'ETF Emergentes', category: 'INDICES' },
  { symbol: 'DIA', name: 'SPDR Dow Jones Industrial Average', sector: 'ETF Dow Jones 30', category: 'INDICES' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', sector: 'ETF Pequeñas Empresas', category: 'INDICES' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'ETF Mercado Total EE.UU.', category: 'INDICES' },
];

export const POPULAR_SYMBOLS: CatalogItem[] = RAW_SYMBOLS;

export const MARKET_CATEGORIES = [
  { id: 'ALL', label: 'Todo' },
  { id: 'TECH', label: 'Tecnología e IA' },
  { id: 'CONSUMER', label: 'Consumo y Moda' },
  { id: 'GAMING', label: 'Videojuegos' },
  { id: 'CRYPTO', label: 'Criptomonedas' },
  { id: 'AUTO', label: 'Automotriz' },
  { id: 'MEDIA', label: 'Streaming y Cine' },
  { id: 'BANKING', label: 'Banca y Finanzas' },
  { id: 'ENERGY', label: 'Energía y Petróleo' },
  { id: 'INDICES', label: 'Índices y ETFs' },
];

export function mapYahooToCategory(item: { sector?: string; industry?: string; type?: string; symbol?: string; category?: string }): string {
  if (item.category && item.category !== 'OTHER') return item.category;

  const ind = (item.industry || '').toLowerCase();
  const sec = (item.sector || '').toLowerCase();
  const typ = (item.type || '').toLowerCase();
  const sym = (item.symbol || '').toUpperCase();

  if (typ === 'cryptocurrency' || sym.includes('-USD') || sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL')) {
    return 'CRYPTO';
  }
  if (typ === 'etf' || sym.startsWith('^') || sym === 'SPY' || sym === 'QQQ' || sym === 'GLD' || sym.includes('ETF')) {
    return 'INDICES';
  }
  if (ind.includes('gaming') || ind.includes('game') || ind.includes('multimedia') || ['TTWO', 'EA', 'UBI.PA', 'RBLX', 'SONY', 'NTDOY', 'CDR.WA', 'U', 'CCOEY', 'SGAMY', 'KNAMF', 'APP', 'SQNXF', 'BNXPF', 'TKOMY', 'EMBRAC-B.ST', 'PDX.ST', 'REMEDY.HE', '11B.WA', 'TCEHY', 'NTES', '259960.KS', '036570.KS', 'SE', 'BILI', 'CRSR', 'LOGI', 'HEAR', 'PLTK'].includes(sym)) {
    return 'GAMING';
  }
  if (ind.includes('auto') || ind.includes('vehicle') || ['TSLA', 'RACE', 'F', 'GM', 'BMW3.DE', 'P911.DE', 'MBG.DE', 'VOW3.DE', 'STLA', 'TM', 'HMC', 'RIVN', 'LCID', 'PAH3.DE', 'AML.L', 'RNO.PA', 'VOLV-B.ST', '7201.T', '7270.T', '7269.T', '7261.T', 'HYMTF', '000270.KS', 'BYDDY', 'NIO', 'LI', 'XPEV', 'QS', 'CHPT', 'BLNK', 'CON.DE', 'PRY.MI', 'HOG', 'POL', 'PIA.MI'].includes(sym)) {
    return 'AUTO';
  }
  if (ind.includes('entertainment') || ind.includes('broadcasting') || ind.includes('streaming') || ind.includes('telecom') || ['NFLX', 'DIS', 'SPOT', 'WBD', 'PARA', 'CMCSA', 'TEF.MC', 'T', 'VZ', 'ROKU'].includes(sym)) {
    return 'MEDIA';
  }
  if (sec.includes('financial') || ind.includes('bank') || ind.includes('credit') || ['SAN.MC', 'BBVA.MC', 'CABK.MC', 'JPM', 'BAC', 'GS', 'MS', 'V', 'MA', 'PYPL', 'AXP', 'BLK', 'BRK-B'].includes(sym)) {
    return 'BANKING';
  }
  if (sec.includes('energy') || sec.includes('utilities') || ind.includes('oil') || ind.includes('gas') || ind.includes('defense') || ind.includes('aerospace') || ['REP.MC', 'IBE.MC', 'XOM', 'CVX', 'SHEL', 'TTE', 'BA', 'AIR.PA', 'CAT', 'LMT'].includes(sym)) {
    return 'ENERGY';
  }
  if (sec.includes('consumer') || ind.includes('retail') || ind.includes('apparel') || ind.includes('beverage') || ind.includes('restaurant') || ['NKE', 'KO', 'PEP', 'MCD', 'SBUX', 'ITX.MC', 'MC.PA', 'KER.PA', 'OR.PA', 'RMS.PA', 'COST', 'WMT', 'TGT', 'PG', 'MNST', 'ABNB', 'BKNG', 'UBER', 'LULU', 'CFR.SW', 'MONC.MI', 'PRDSY', 'BRBY.L', 'SFER.MI', 'BC.MI', 'ADS.DE', 'PUM.DE', 'ONON', 'DECK', 'SKX', 'CROX', 'LEVI', 'RL', 'CPRI', 'TPR', 'HMB.ST', 'ZAL.DE', 'UAA', 'QSR', 'YUM', 'CMG', 'DPZ', 'WEN', 'SHAK', 'DRI', 'CELH', 'KDP', 'NESN.SW', 'MDLZ', 'HSY', 'K', 'KHC', 'GIS', 'DEO', 'HEINY', 'BUD', 'CCEP', 'UL', 'CL', 'EL', 'KMB', 'CA.PA', 'TSCO.L', 'AD.AS', 'DIA.MC', 'EXPE', 'DASH', 'MAR', 'HLT', 'RCL', 'CCL'].includes(sym)) {
    return 'CONSUMER';
  }
  if (sec.includes('technology') || ind.includes('semiconductor') || ind.includes('software') || ind.includes('electronics') || ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD', 'PLTR', 'INTC', 'TSM', 'ARM', 'AVGO', 'QCOM', 'ASML', 'CRM', 'ADBE', 'ORCL', 'IBM', 'NOW', 'PANW', 'CRWD', 'DELL', 'SMCI', 'MU', 'TXN', 'ADI', 'MRVL', 'LRCX', 'KLAC', 'AMAT', 'NXPI', 'ON', 'STM', 'IFX.DE', 'HPQ', 'HPE', 'WDC', 'STX', 'SAP', 'SNOW', 'WDAY', 'INTU', 'TEAM', 'MDB', 'DDOG', 'NET', 'PATH', 'FTNT', 'ZS', 'OKTA', 'S', 'CYBR', 'BABA', 'JD', 'BIDU'].includes(sym)) {
    return 'TECH';
  }
  return 'OTHER';
}


// =====================================================================
// Acceso a la API de mercado
// =====================================================================

const SUPABASE_FUNCTION_URL = 'https://vvxfewktdsltzsxfumio.supabase.co/functions/v1/market';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_RXWhW8Lu_vIehqKQJAPsQw_GkvczmaZ';

interface Endpoint {
  url: string;
  headers: Record<string, string>;
}

/**
 * Producción (GitHub Pages): función "market" de Supabase.
 * Desarrollo (npm run dev): /api/market del servidor de Vite, que ejecuta el mismo código en local.
 * VITE_MARKET_API_URL permite apuntar a otro proxy si algún día hiciera falta.
 */
function getEndpoints(): Endpoint[] {
  const env = (import.meta as any).env || {};
  const supabase: Endpoint = {
    url: SUPABASE_FUNCTION_URL,
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
  };
  if (env.VITE_MARKET_API_URL) return [{ url: env.VITE_MARKET_API_URL, headers: {} }, supabase];
  if (env.DEV) return [{ url: new URL('api/market', document.baseURI).toString(), headers: {} }, supabase];
  return [supabase];
}

let preferredEndpoint = 0;

/** Llama a la API de mercado probando los endpoints en orden. Devuelve el JSON o null. */
async function marketRequest(params: Record<string, string>, timeoutMs: number, signal?: AbortSignal): Promise<any | null> {
  const endpoints = getEndpoints();
  for (let i = preferredEndpoint; i < endpoints.length; i++) {
    const ep = endpoints[i];
    const url = new URL(ep.url);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
      const timeout = AbortSignal.timeout(timeoutMs);
      const anyFn = (AbortSignal as any).any;
      const combined: AbortSignal = signal && anyFn ? anyFn([signal, timeout]) : signal || timeout;
      const res = await fetch(url.toString(), { headers: ep.headers, signal: combined });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Este endpoint no existe aquí (p. ej. GitHub Pages devuelve HTML): usar el siguiente a partir de ahora
        if (i === preferredEndpoint && i < endpoints.length - 1) preferredEndpoint = i + 1;
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      if (signal?.aborted) throw err;
      // Timeout o error de red: probar el siguiente endpoint
    }
  }
  return null;
}

// =====================================================================
// Conversión de datos de Yahoo
// =====================================================================

const pricePrecision = (price: number) => (Math.abs(price) < 0.01 ? 6 : Math.abs(price) < 1 ? 4 : 2);
const round = (value: number, digits: number) => Number(value.toFixed(digits));

function quoteFromMeta(meta: any, isDailyRange: boolean): StockQuote | null {
  const price: number | undefined = meta?.regularMarketPrice ?? meta?.previousClose;
  if (!price || !meta?.symbol) return null;

  // Cierre anterior real (chartPreviousClose sólo es el cierre de ayer si el rango es de 1 día)
  let prevClose: number | undefined = meta.previousClose;
  if (prevClose === undefined && isDailyRange) prevClose = meta.chartPreviousClose;
  if (prevClose === undefined && typeof meta.regularMarketChangePercent === 'number') {
    prevClose = price / (1 + meta.regularMarketChangePercent / 100);
  }
  if (prevClose === undefined) prevClose = price;

  // Los tipos de cambio necesitan más decimales (1.1143 no puede quedarse en 1.11)
  const precision = meta.instrumentType === 'CURRENCY' ? 6 : pricePrecision(price);
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;
  const regular = meta.currentTradingPeriod?.regular;

  return {
    symbol: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    price: round(price, precision),
    change: round(change, precision),
    changePercent: round(changePercent, 2),
    open: meta.regularMarketOpen ?? price,
    high: meta.regularMarketDayHigh ?? price,
    low: meta.regularMarketDayLow ?? price,
    prevClose: round(prevClose, precision),
    volume: meta.regularMarketVolume ? Number(meta.regularMarketVolume).toLocaleString('es-ES') : 'N/A',
    marketCap: meta.marketCap ? formatCurrency(meta.marketCap, meta.currency || 'USD', true) : 'N/A',
    week52High: meta.fiftyTwoWeekHigh,
    week52Low: meta.fiftyTwoWeekLow,
    currency: meta.currency || 'USD',
    exchange: meta.fullExchangeName || meta.exchangeName || '',
    instrumentType: meta.instrumentType,
    marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : undefined,
    sessionStart: regular?.start ? regular.start * 1000 : undefined,
    sessionEnd: regular?.end ? regular.end * 1000 : undefined,
    fetchedAt: Date.now(),
  };
}

function getTimeRangeParams(range: TimeRange, symbol: string): { range: string; interval: string } {
  const isCrypto = /-(USD|EUR|USDT)$/.test(symbol);
  switch (range) {
    case '1H':
      return { range: '1d', interval: '2m' };
    case '1D':
      return { range: isCrypto ? '2d' : '1d', interval: '5m' };
    case '1W':
      return { range: '5d', interval: '15m' };
    case '1M':
      return { range: '1mo', interval: '60m' };
    case '1Y':
      return { range: '1y', interval: '1d' };
    case '5Y':
      return { range: '5y', interval: '1wk' };
    case 'ALL':
      return { range: 'max', interval: '1mo' };
    default:
      return { range: '1d', interval: '5m' };
  }
}

const stockDataCache = new Map<string, { data: { quote: StockQuote; chart: ChartPoint[] }; timestamp: number }>();
const CACHE_TTL_MS = 60_000;

export function clearStockCache(symbol?: string) {
  if (!symbol) {
    stockDataCache.clear();
    return;
  }
  const prefix = `${symbol.toUpperCase()}_`;
  for (const key of stockDataCache.keys()) {
    if (key.startsWith(prefix)) stockDataCache.delete(key);
  }
}

/** Cotización + gráfica de un símbolo (datos reales; null si no hay datos). */
export async function fetchStockData(
  symbol: string,
  range: TimeRange = '1D',
  signal?: AbortSignal,
  forceRefresh: boolean = false
): Promise<{ quote: StockQuote; chart: ChartPoint[] } | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `${cleanSymbol}_${range}`;

  if (!forceRefresh) {
    const cached = stockDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;
  }

  const params = getTimeRangeParams(range, cleanSymbol);
  const data = await marketRequest({ symbol: cleanSymbol, range: params.range, interval: params.interval }, 8000, signal);
  const result = data?.chart?.result?.[0];
  if (!result?.meta || String(result.meta.symbol || '').toUpperCase() !== cleanSymbol) return null;

  const quote = quoteFromMeta(result.meta, params.range === '1d' || params.range === '2d');
  if (!quote) return null;

  const timestamps: number[] = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const closes: (number | null)[] = q.close || [];
  const precision = quote.instrumentType === 'CURRENCY' ? 6 : pricePrecision(quote.price);

  let chart: ChartPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close === null || close === undefined || isNaN(close)) continue;
    const ts = timestamps[i] * 1000;
    const date = new Date(ts);
    const dateStr =
      range === '1H' || range === '1D'
        ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : range === '1W' || range === '1M'
        ? date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: range === '1Y' ? undefined : '2-digit' });
    chart.push({
      timestamp: ts,
      dateStr,
      price: round(close, precision),
      open: q.open?.[i] ?? undefined,
      high: q.high?.[i] ?? undefined,
      low: q.low?.[i] ?? undefined,
      close: round(close, precision),
      volume: q.volume?.[i] || 0,
    });
  }

  if (range === '1H') {
    const end = chart.length > 0 ? chart[chart.length - 1].timestamp : Date.now();
    chart = chart.filter((p) => p.timestamp >= end - 60 * 60 * 1000);
  }
  if (range === '1D' && chart.length > 288) chart = chart.slice(-288);
  if (chart.length === 0) return null;

  const payload = { quote, chart };
  stockDataCache.set(cacheKey, { data: payload, timestamp: Date.now() });
  return payload;
}

/** Cotizaciones de varios símbolos en una sola petición (la API los divide en lotes). */
export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  const quotes: Record<string, StockQuote> = {};
  const unique = Array.from(new Set(symbols.filter(Boolean)));
  if (unique.length === 0) return quotes;

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const data = await marketRequest({ symbols: chunk.join(',') }, 8000);
        const results: any[] = data?.spark?.result || [];
        results.forEach((r) => {
          const quote = quoteFromMeta(r?.response?.[0]?.meta, true);
          if (quote) quotes[quote.symbol] = quote;
        });
      } catch {
        // sin datos para este lote
      }
    })
  );

  return quotes;
}

/** Búsqueda de símbolos: catálogo local + búsqueda global de Yahoo. */
export async function searchSymbols(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const lowerQ = cleanQ.toLowerCase();
  const resultMap = new Map<string, SearchResult>();
  POPULAR_SYMBOLS.filter(
    (s) => s.symbol.toLowerCase().includes(lowerQ) || s.name.toLowerCase().includes(lowerQ) || s.sector.toLowerCase().includes(lowerQ)
  ).forEach((s) =>
    resultMap.set(s.symbol, {
      symbol: s.symbol,
      name: s.name,
      exchange: s.category === 'CRYPTO' ? 'Cripto' : '',
      type: s.category === 'CRYPTO' ? 'CRYPTOCURRENCY' : 'EQUITY',
      sector: s.sector,
    })
  );

  const data = await marketRequest({ q: cleanQ }, 5000, signal);
  const remote: any[] = Array.isArray(data?.quotes) ? data.quotes : [];
  remote
    .filter((q) => q.symbol && (q.shortname || q.longname) && q.quoteType !== 'OPTION' && q.quoteType !== 'FUTURE')
    .forEach((q) => {
      if (resultMap.has(q.symbol)) return;
      resultMap.set(q.symbol, {
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
        type: q.quoteType || 'EQUITY',
        sector: q.sectorDisp || q.sector || (q.quoteType === 'CRYPTOCURRENCY' ? 'Cripto' : q.quoteType === 'ETF' ? 'ETF' : undefined),
        industry: q.industryDisp || q.industry,
      });
    });

  return Array.from(resultMap.values());
}

/** Lista real de Yahoo (más negociadas, suben, bajan, cripto...). */
export async function fetchScreener(
  id: string,
  start: number = 0,
  count: number = 50
): Promise<{ total: number; quotes: StockQuote[] } | null> {
  const data = await marketRequest({ screener: id, start: String(start), count: String(count) }, 8000);
  if (!data || !Array.isArray(data.quotes)) return null;
  const now = Date.now();
  const quotes: StockQuote[] = [];
  data.quotes.forEach((q: any) => {
    const price = q.regularMarketPrice;
    if (!q.symbol || !(price > 0)) return;
    const prevClose = q.regularMarketPreviousClose ?? price - (q.regularMarketChange ?? 0);
    const precision = q.quoteType === 'CURRENCY' ? 6 : pricePrecision(price);
    const change = price - prevClose;
    quotes.push({
      symbol: q.symbol,
      name: q.longName || q.shortName || q.symbol,
      price: round(price, precision),
      change: round(change, precision),
      changePercent: round(prevClose ? (change / prevClose) * 100 : 0, 2),
      open: q.regularMarketOpen ?? price,
      high: q.regularMarketDayHigh ?? price,
      low: q.regularMarketDayLow ?? price,
      prevClose: round(prevClose, precision),
      volume: q.regularMarketVolume ? Number(q.regularMarketVolume).toLocaleString('es-ES') : 'N/A',
      marketCap: q.marketCap ? formatCurrency(q.marketCap, q.currency || 'USD', true) : 'N/A',
      week52High: q.fiftyTwoWeekHigh,
      week52Low: q.fiftyTwoWeekLow,
      currency: q.currency || 'USD',
      exchange: q.fullExchangeName || q.exchange || '',
      instrumentType: q.quoteType,
      marketTime: q.regularMarketTime ? q.regularMarketTime * 1000 : undefined,
      marketState: q.marketState,
      fetchedAt: now,
    });
  });
  return { total: Number(data.total) || quotes.length, quotes };
}

// =====================================================================
// Estado del mercado
// =====================================================================

export type MarketStatus = 'OPEN' | 'CLOSED' | 'DELAYED';

const STALE_AFTER_MS = 20 * 60 * 1000;

export function isAlwaysOpen(quote: Pick<StockQuote, 'instrumentType' | 'symbol'>): boolean {
  return quote.instrumentType === 'CRYPTOCURRENCY' || /-(USD|EUR|USDT)$/.test(quote.symbol);
}

export function getMarketStatus(quote: StockQuote, now: number = Date.now()): MarketStatus {
  const lastTick = quote.marketTime ?? quote.fetchedAt;
  if (isAlwaysOpen(quote)) {
    return now - lastTick > STALE_AFTER_MS ? 'DELAYED' : 'OPEN';
  }
  const hasSession = !!quote.sessionStart && !!quote.sessionEnd;
  const open = hasSession
    ? now >= quote.sessionStart! && now < quote.sessionEnd!
    : quote.marketState === 'REGULAR' && now - quote.fetchedAt < STALE_AFTER_MS;
  if (!open) return 'CLOSED';
  return now - lastTick > STALE_AFTER_MS ? 'DELAYED' : 'OPEN';
}

// =====================================================================
// Formato
// =====================================================================

const SUBUNIT_CURRENCIES: Record<string, string> = { GBp: 'GBX', GBX: 'GBX', ZAc: 'ZAc', ILA: 'ILA' };

export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  compact: boolean = false,
  noDecimals: boolean = false
): string => {
  const v = value === undefined || value === null || isNaN(value) ? 0 : value;

  if (SUBUNIT_CURRENCIES[currency]) {
    const digits = noDecimals ? 0 : 2;
    return `${v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${SUBUNIT_CURRENCIES[currency]}`;
  }

  const abs = Math.abs(v);
  try {
    if (compact && abs >= 100_000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(v);
    }
    const maxDigits = noDecimals ? 0 : abs > 0 && abs < 0.01 ? 6 : abs > 0 && abs < 1 ? 4 : 2;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: noDecimals ? 0 : 2,
      maximumFractionDigits: maxDigits,
    }).format(v);
  } catch {
    return `${v.toFixed(noDecimals ? 0 : 2)} ${currency}`;
  }
};

export const formatPercent = (value: number, includeSign: boolean = true): string => {
  if (value === undefined || value === null || isNaN(value)) return '0.00%';
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export function formatTimeAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export const RANGE_LABELS: Record<TimeRange, string> = {
  '1H': '1H',
  '1D': '1D',
  '1W': '1S',
  '1M': '1M',
  '1Y': '1A',
  '5Y': '5A',
  ALL: 'Todo',
};
