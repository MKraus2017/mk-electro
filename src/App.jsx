import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  "https://nssffrjalyauqjlpvblf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zc2ZmcmphbHlhdXFqbHB2YmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMjA4OTAsImV4cCI6MjA5NTc5Njg5MH0.KlHN0F386n1Lt9KuiiWkWrKZvjB4L2IwwGVSBrPLEwo"
);

// ── DB helpers ────────────────────────────────────────────────────────────────
// Map Supabase row → app product shape
function rowToProduct(r) {
  return {
    id: r.id, name: r.name, category: r.category, price: parseFloat(r.price)||0,
    ek: parseFloat(r.ek)||0, shipping: parseFloat(r.shipping)||0,
    stock: r.stock||0, stockExternal: r.stock_external||0,
    delivery: r.delivery||"", sku: r.sku||"",
    images: r.images||[], description: r.description||"",
    supplier: r.supplier||"",
  };
}
// Map app product → Supabase row shape
function productToRow(p) {
  return {
    name: p.name, category: p.category, price: p.price,
    ek: p.ek, shipping: p.shipping, stock: p.stock,
    stock_external: p.stockExternal, delivery: p.delivery,
    sku: p.sku, images: p.images, description: p.description,
    supplier: p.supplier||"",
  };
}
// Map Supabase row → app order shape
function rowToOrder(r) {
  return {
    id: r.id, date: r.date, status: r.status, payment: r.payment,
    customer: { name: r.customer_name, email: r.customer_email,
      street: r.customer_street, zip: r.customer_zip, city: r.customer_city },
    items: r.items||[], total: parseFloat(r.total)||0,
    newsletter: r.newsletter || false,
    carrier: r.carrier || null,
    tracking_number: r.tracking_number || null,
    serial_numbers: r.serial_numbers || null,
  };
}
// Map app order → Supabase row shape
function orderToRow(o) {
  return {
    id: o.id, date: o.date, status: o.status, payment: o.payment,
    customer_name: o.customer?.name, customer_email: o.customer?.email,
    customer_street: o.customer?.street, customer_zip: o.customer?.zip,
    customer_city: o.customer?.city, items: o.items, total: o.total,
    newsletter: o.newsletter || false,
  };
}

// ── Default Products ──────────────────────────────────────────────────────────
// Lagerstand 29.05.2026 — externe Lagerliste aktualisiert
// VK-Preise = inkl. Versandkosten (Hermes/DHL) · eBay-Gebühren einkalkuliert
const DEFAULT_PRODUCTS = [
  // ── BESTANDSARTIKEL (Lagerbestand + Preise korrigiert) ───────────────────
  { id:1,  name:"Philips Series 1200 Kaffeevollautomat EP1220/00", category:"Kaffee & Küche",         price:239.00, ek:189.90, shipping:8.99, stock:4,  stockExternal:116, delivery:"2-4 Werktage", sku:"EP1220/00",     images:["https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&q=80"], description:"Kaffeevollautomat mit OneTouch-Bedienung, 15 bar, 1500W, Keramik-Mahlwerk, Milchaufschäumer. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:2,  name:"Pioneer MVH-S320BT Autoradio Bluetooth",          category:"Autoradio & Navigation",  price:79.90,  ek:57.00,  shipping:5.49, stock:22, stockExternal:461, delivery:"1-3 Werktage", sku:"MVH-S320BT",   images:["https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&q=80"], description:"1-DIN Bluetooth-Autoradio, USB, AUX, Freisprechanlage, MIXTRAX, Spotify. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:3,  name:"Braun Series 9 Pro+ 9565CC Rasierer",             category:"Rasieren & Pflege",       price:259.00, ek:209.00, shipping:6.99, stock:0,  stockExternal:334, delivery:"2-4 Werktage", sku:"9-9565CC-EU1", images:["https://images.unsplash.com/photo-1621605815971-5af68e5e0e60?w=600&q=80"], description:"Nass- & Trockenrasierer, 360° Flex-Kopf, 60 Min Akku, SmartCare Station. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:4,  name:"Philips Air Fryer Double Basket NA352/00",         category:"Kaffee & Küche",         price:149.00, ek:115.00, shipping:8.99, stock:6,  stockExternal:200, delivery:"3-5 Werktage", sku:"NA352/00",     images:["https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=600&q=80"], description:"6L/3L Doppelkorb Heißluftfritteuse, 2750W Touchscreen, S3000 Serie. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:5,  name:"Philips DST7511/80 Dampfbügeleisen 7500",         category:"Haushalt",               price:82.90,  ek:59.90,  shipping:6.99, stock:20, stockExternal:354, delivery:"1-3 Werktage", sku:"DST7511/80",  images:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"], description:"Profi-Dampfbügeleisen 7500 Series, 220g Dampfstoß, OptimalTEMP-Sohle, 2400W. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:6,  name:"Remington S8590 Keratin Therapy Haarglätter",     category:"Haarpflege",             price:39.90,  ek:23.00,  shipping:5.49, stock:35, stockExternal:1669,delivery:"1-2 Werktage", sku:"S8590",        images:["https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80"], description:"Keramik-Haarglätter, Keratin Therapy, Hitzeschutzsensor, 5 Temperaturen, 230°C. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:7,  name:"Braun Silk·expert Pro 3 PL3122 IPL",              category:"Rasieren & Pflege",       price:259.00, ek:219.00, shipping:6.99, stock:0,  stockExternal:130, delivery:"2-4 Werktage", sku:"PL3122",       images:["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80"], description:"IPL Haarentfernung, 300.000 Lichtimpulse, SkinSafe Technologie, 3 Köpfe. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:8,  name:"Philips S9980/54 Rasierer SkinIQ",                category:"Rasieren & Pflege",       price:249.00, ek:199.00, shipping:6.99, stock:0,  stockExternal:140, delivery:"2-4 Werktage", sku:"S9980/54",    images:["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"], description:"Premium Wet & Dry Rasierer, SkinIQ-Technologie, 5-fach Klingensystem. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  // ── NEUE ARTIKEL (Lagerliste 29.05.2026, Marge nach Gebühren ≥ 25%) ─────
  { id:9,  name:"Oral-B iO Series 2 Elektrische Zahnbürste",       category:"Zahnpflege",             price:44.90,  ek:29.90,  shipping:5.49, stock:0,  stockExternal:1184,delivery:"3-5 Werktage", sku:"IO2LABORATORY/BK", images:["https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&q=80"], description:"iO Magnettechnologie, 3 Reinigungsmodi, Andruckkontrolle, Reiseetui, USB-Ladestation. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:10, name:"Philips Sonicare 2100 HX3651 Zahnbürste",         category:"Zahnpflege",             price:32.90,  ek:19.90,  shipping:5.49, stock:0,  stockExternal:3650,delivery:"3-5 Werktage", sku:"HX3651/12",    images:["https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80"], description:"Sonicare Schalltechnologie, 31.000 Bewegungen/Min, SmartTimer, USB-Ladekabel. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:11, name:"Philips Sonicare 3100 HX3673 Zahnbürste",         category:"Zahnpflege",             price:54.90,  ek:32.50,  shipping:5.49, stock:0,  stockExternal:600, delivery:"3-5 Werktage", sku:"HX3673/13",    images:["https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&q=80"], description:"Schallzahnbürste 3100 Series, Drucksensor, 2-Wochen-Akku, Andruckkontrolle. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:12, name:"Oral-B iO Series 4 Zahnbürste Magnetic",          category:"Zahnpflege",             price:94.90,  ek:59.00,  shipping:5.49, stock:0,  stockExternal:346, delivery:"3-5 Werktage", sku:"IO4MAGNETIC/BK",images:["https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&q=80"], description:"iO Magnettechnologie, 4 Reinigungsmodi, farbiges Display, Andruckkontrolle, Reiseetui. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:13, name:"Braun Silk-épil 5-620 Epilierer Wet & Dry",       category:"Rasieren & Pflege",       price:69.90,  ek:39.90,  shipping:6.99, stock:0,  stockExternal:989, delivery:"3-5 Werktage", sku:"SES5-620",     images:["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80"], description:"Wet & Dry Epilierer, 40 Pinzetten, 3 Zubehörteile, Rasieraufsatz, 30 Min Akku. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:14, name:"Braun Silk-épil 9 SES9-000 Epilierer SensoSmart", category:"Rasieren & Pflege",       price:119.00, ek:75.00,  shipping:6.99, stock:0,  stockExternal:251, delivery:"3-5 Werktage", sku:"SES9-000",     images:["https://images.unsplash.com/photo-1620756236308-65c3ef5d25f3?w=600&q=80"], description:"Premium Wet & Dry Epilierer, SensoSmart-Technologie, 40 Pinzetten, Massage-Aufsatz. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:15, name:"Pioneer MVH-230BT Autoradio Bluetooth",            category:"Autoradio & Navigation",  price:79.90,  ek:49.90,  shipping:5.49, stock:0,  stockExternal:460, delivery:"3-5 Werktage", sku:"MVH-230BT",   images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN Mediareceiver, Bluetooth Audio & Freisprechen, USB, RDS Tuner, 4×50W MOSFET. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:16, name:"Philips S5885/50 Rasierer SkinIQ 360°",           category:"Rasieren & Pflege",       price:134.90, ek:89.90,  shipping:6.99, stock:0,  stockExternal:300, delivery:"3-5 Werktage", sku:"S5885/50",    images:["https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80"], description:"SkinIQ 360° Nass & Trocken, 90.000 Schnitte/Min, Smart Cleaning System, 60 Min Akku. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },
  { id:17, name:"Philips Ironing Center PSG7130/20",                category:"Haushalt",               price:219.00, ek:159.00, shipping:8.99, stock:0,  stockExternal:123, delivery:"3-5 Werktage", sku:"PSG7130/20",  images:["https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&q=80"], description:"Dampfbügelstation 7000 Series, 8 bar, 160g Dampfstoß, OptimalTemp-Sohle, 1,5 L Tank. Inkl. kostenlosem Versand." , supplier:"Mediaelectronics Spain" },

  // ── NEUE ARTIKEL (Lagerliste dbreactor 29.05.2026) ──────────────────────────
  { id:18, name:"Pioneer SPH-PF97BT 9\" Touchscreen Autoradio",      category:"Autoradio & Navigation",  price:414.90, ek:331.83, shipping:7.99, stock:0,  stockExternal:71,  delivery:"2-4 Werktage", sku:"SPH-PF97BT",  images:["https://images.cdn.aisleriot.com/v1/productImages/b2f5b6c3-3ba7-4d47-9e89-5e07a5e4b3f2/1/convertedCompressedImage.jpg","https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&q=80"], description:'9" Floating 1-DIN, Apple CarPlay (kabellos), Android Auto (kabellos), Bluetooth, WiFi, DAB+, Touchscreen. Inkl. kostenlosem Versand.' , supplier:"dbreactor" },
  { id:19, name:"Pioneer MVH-S420BT Autoradio 13-Band EQ",           category:"Autoradio & Navigation",  price:79.90,  ek:67.71,  shipping:5.49, stock:0,  stockExternal:38,  delivery:"1-3 Werktage", sku:"MVH-S420BT",  images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN Bluetooth-Autoradio, 13-Band Grafik-EQ, FLAC, USB, AUX, Freisprechanlage, Spotify. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:20, name:"JBL Tune 720BT Wireless Over-Ear Kopfhörer Weiß",   category:"Kopfhörer & Audio",       price:59.90,  ek:44.03,  shipping:4.99, stock:0,  stockExternal:6,   delivery:"2-4 Werktage", sku:"JBLT720BTWHT", images:["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80"], description:"Wireless Over-Ear, JBL Pure Bass Sound, 76h Akku, Bluetooth 5.3, faltbares Design, Freisprechmikrofon. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:21, name:"JBL Wave 200 TWS True Wireless Earbuds",            category:"Kopfhörer & Audio",       price:39.90,  ek:29.75,  shipping:4.99, stock:0,  stockExternal:4,   delivery:"2-4 Werktage", sku:"JBLW200TWSBLK", images:["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80"], description:"True Wireless Earbuds, JBL Deep Bass Sound, 20h Gesamtakku (5h+15h Case), USB-C, kabellos laden. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:22, name:"Bose QuietComfort Wireless ANC Kopfhörer",          category:"Kopfhörer & Audio",       price:284.90, ek:212.76, shipping:6.99, stock:0,  stockExternal:2,   delivery:"2-4 Werktage", sku:"884367-0100",  images:["https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80"], description:"Premium ANC Over-Ear, Bose QuietComfort, 24h Akku, Alexa & Google integriert, Bluetooth 5.1, Noise Cancelling. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:23, name:"Canton DM 5 Soundbar 120W Bluetooth",               category:"Lautsprecher & Soundbar", price:229.90, ek:166.60, shipping:8.99, stock:0,  stockExternal:27,  delivery:"2-4 Werktage", sku:"03793",        images:["https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80"], description:"Deutsche Soundbar, 120W, Virtual Surround, Bluetooth, opt./koax./analog, Glasoberfläche, Wandmontage möglich. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:24, name:"Belkin SoundForm Bolt True Wireless Earbuds",       category:"Kopfhörer & Audio",       price:29.90,  ek:14.28,  shipping:3.99, stock:0,  stockExternal:135, delivery:"1-3 Werktage", sku:"AUC009BTBLK",  images:["https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600&q=80"], description:"True Wireless Earbuds, IPX5 wassergeschützt, 30h Gesamtakku (8h+22h Case), Bluetooth 5.2, USB-C Laden. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:25, name:"Kenwood KFC-E170P 2-Wege Koaxial Lautsprecher",    category:"Autoradio & Navigation",  price:49.90,  ek:33.86,  shipping:5.49, stock:0,  stockExternal:12,  delivery:"2-4 Werktage", sku:"KFC-E170P",    images:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"], description:"2-Wege Koaxial Car Speaker, 170mm, 300W Peak, 92dB, 30-22000Hz. Paar inkl. Montagematerial. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:26, name:"Kenwood KFC-E130P 2-Wege Koaxial Lautsprecher",    category:"Autoradio & Navigation",  price:34.90,  ek:24.99,  shipping:5.49, stock:0,  stockExternal:15,  delivery:"2-4 Werktage", sku:"KFC-E130P",    images:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"], description:"2-Wege Koaxial Car Speaker, 130mm, 250W Peak, 91dB, 40-22000Hz. Paar inkl. Montagematerial. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:27, name:"Shure SM58 Dynamisches Gesangsmikrofon",            category:"Mikrofon & Studio",       price:119.90, ek:91.63,  shipping:5.99, stock:0,  stockExternal:33,  delivery:"1-3 Werktage", sku:"SM58LCE",      images:["https://images.unsplash.com/photo-1520170350707-b2da59970118?w=600&q=80"], description:"Professionelles Gesangsmikrofon, 50-15000Hz, Kardioid, robustes Metallgehäuse, Industrie-Standard auf Bühnen weltweit. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:28, name:"Rode Wireless ME Funkmikrofon System",              category:"Mikrofon & Studio",       price:109.90, ek:75.20,  shipping:5.99, stock:0,  stockExternal:28,  delivery:"1-3 Werktage", sku:"WIMICROCW",    images:["https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&q=80"], description:"Kompaktes 2,4GHz Wireless Mikrofon, für Smartphone & Kamera, bis 100m Reichweite, integrierter Windschutz. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:29, name:"Yamaha TW-E3B True Wireless Earbuds",               category:"Kopfhörer & Audio",       price:54.90,  ek:34.63,  shipping:4.99, stock:0,  stockExternal:26,  delivery:"2-4 Werktage", sku:"TW-E3BPP",     images:["https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=600&q=80"], description:"True Wireless Earbuds, Listening Care Technologie, IPX5, 6h+15h Akku, Ambient Sound, Premium-Klang. Inkl. kostenlosem Versand." , supplier:"dbreactor" },
  { id:30, name:"Alpine iLX-F115D 11\" 1-DIN Multimedia System",     category:"Autoradio & Navigation",  price:1104.90,ek:910.35, shipping:9.99, stock:0,  stockExternal:2,   delivery:"3-5 Werktage", sku:"ILX-F115D",    images:["https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&q=80"], description:'11" Floating Display, DAB+, Bluetooth, Apple CarPlay, Android Auto, 4×50W, HDMI. Inkl. kostenlosem Versand.' , supplier:"dbreactor" },

  // ── NEUE ARTIKEL (Car Audio Liste Mediaelectronics 21.05.2026) ──────────────
  { id:31, name:"Pioneer SPH-DA77DAB 6.8\" CarPlay Android Auto DAB+",  category:"Autoradio & Navigation", price:394.90, ek:303.45, shipping:7.99, stock:0, stockExternal:65,  delivery:"2-4 Werktage", sku:"SPH-DA77DAB",     supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&q=80"], description:'2-DIN 6.8" Touch, Wireless Apple CarPlay & Android Auto, DAB+, WiFi, Bluetooth, 13-Band EQ, 4×50W. Inkl. kostenlosem Versand.' },
  { id:32, name:"Pioneer DMH-A240BT 6.2\" Mechless 2-DIN Touchscreen",  category:"Autoradio & Navigation", price:154.90, ek:117.81, shipping:6.99, stock:0, stockExternal:101, delivery:"1-3 Werktage", sku:"DMH-A240BT",      supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:'2-DIN 6.2" Mechless Touchscreen, Bluetooth, USB, Smartphone-Mirroring, Spotify, 13-Band EQ, 4×50W. Inkl. kostenlosem Versand.' },
  { id:33, name:"Pioneer MVH-S520BT 1-DIN Multicolor Bluetooth",        category:"Autoradio & Navigation", price:129.90, ek:98.17,  shipping:5.99, stock:0, stockExternal:102, delivery:"1-3 Werktage", sku:"MVH-S520BT",      supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN Bluetooth, Multicolor-Beleuchtung, USB, Spotify, FLAC, 4×50W. Inkl. kostenlosem Versand." },
  { id:34, name:"Blaupunkt Hamburg SQM 23 DAB Youngtimer 2-DIN",        category:"Autoradio & Navigation", price:399.90, ek:308.21, shipping:7.99, stock:0, stockExternal:70,  delivery:"2-4 Werktage", sku:"HAMBURGSQM23DAB", supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80"], description:"Retro Youngtimer 2-DIN, DAB+, Bluetooth, USB, CD — klassisches Design mit moderner Technik. Inkl. kostenlosem Versand." },
  { id:35, name:"Blaupunkt Bremen SQR 46 DAB Retro 2-DIN Holzdekor",   category:"Autoradio & Navigation", price:444.90, ek:343.91, shipping:7.99, stock:0, stockExternal:127, delivery:"2-4 Werktage", sku:"BREMENSQR46DAB",  supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80"], description:"Retro-Design 2-DIN, DAB+, Bluetooth, USB, CD, echter Holzdekor-Front, Aluminium. Inkl. kostenlosem Versand." },
  { id:36, name:"Blaupunkt Frankfurt Stereo MB Retro 70er Stil",        category:"Autoradio & Navigation", price:819.90, ek:629.51, shipping:8.99, stock:0, stockExternal:29,  delivery:"2-4 Werktage", sku:"FRANKFURTSTEREO",  supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&q=80"], description:"Premium Retro-Autoradio 70er Jahre Stil, Bluetooth, DAB+, USB — Blickfang für Oldtimer & Youngtimer. Inkl. kostenlosem Versand." },
  { id:37, name:"JVC KW-M593BT 6.8\" 2-DIN CarPlay Android Auto",       category:"Autoradio & Navigation", price:259.90, ek:201.11, shipping:7.49, stock:0, stockExternal:24,  delivery:"2-4 Werktage", sku:"KW-M593BT",       supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&q=80"], description:'2-DIN 6.8" Touch, Apple CarPlay, Android Auto, Bluetooth, USB, 4×50W. Inkl. kostenlosem Versand.' },
  { id:38, name:"JVC KW-M25BT 6.8\" 2-DIN Mechless Bluetooth",          category:"Autoradio & Navigation", price:159.90, ek:124.95, shipping:6.99, stock:0, stockExternal:16,  delivery:"2-4 Werktage", sku:"KW-M25BT",        supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&q=80"], description:'2-DIN 6.8" Mechless Touch, Bluetooth, USB, Android Mirroring, 4×50W. Inkl. kostenlosem Versand.' },
  { id:39, name:"JVC KD-X282BT 1-DIN Deckless BT 13-Band EQ",           category:"Autoradio & Navigation", price:79.90,  ek:62.47,  shipping:5.49, stock:0, stockExternal:245, delivery:"1-3 Werktage", sku:"KD-X282BT",       supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN Deckless, Bluetooth, USB, 13-Band Grafik-EQ, 4×50W. Inkl. kostenlosem Versand." },
  { id:40, name:"Kenwood KDC-BT665U 1-DIN CD Spotify BT 4×50W",        category:"Autoradio & Navigation", price:124.90, ek:95.08,  shipping:5.99, stock:0, stockExternal:150, delivery:"1-3 Werktage", sku:"KDC-BT665U",      supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN CD, USB, Bluetooth, Spotify, 4×50W, 3.5mm Klinke, RDS. Inkl. kostenlosem Versand." },
  { id:41, name:"Kenwood KDC-BT460U 1-DIN CD Bluetooth USB",            category:"Autoradio & Navigation", price:94.90,  ek:73.19,  shipping:5.49, stock:0, stockExternal:147, delivery:"1-3 Werktage", sku:"KDC-BT460U",      supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN CD, USB, Bluetooth, rote Beleuchtung, 4×50W. Inkl. kostenlosem Versand." },
  { id:42, name:"Alpine UTE-200BT 1-DIN Deckless BT USB Hi-Res",        category:"Autoradio & Navigation", price:114.90, ek:89.25,  shipping:5.49, stock:0, stockExternal:55,  delivery:"1-3 Werktage", sku:"UTE-200BT",       supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN Deckless, Bluetooth, USB, AUX, 4×50W, Hi-Res Audio-fähig. Inkl. kostenlosem Versand." },
  { id:43, name:"Blaupunkt Valencia 200 DAB BT 1-DIN Digitalradio",     category:"Autoradio & Navigation", price:109.90, ek:82.70,  shipping:5.49, stock:0, stockExternal:131, delivery:"1-3 Werktage", sku:"VALENCIA200DAB",  supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN, DAB+ Digitalradio, Bluetooth, USB, RDS. Inkl. kostenlosem Versand." },
  { id:44, name:"Blaupunkt Barcelona 200 DAB BT 1-DIN",                 category:"Autoradio & Navigation", price:124.90, ek:96.39,  shipping:5.49, stock:0, stockExternal:66,  delivery:"1-3 Werktage", sku:"BARCELONA200DAB", supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN, DAB+, Bluetooth, USB, RDS. Inkl. kostenlosem Versand." },
  { id:45, name:"Blaupunkt BPA1124 DAB/BT 1-DIN 2× USB",               category:"Autoradio & Navigation", price:74.90,  ek:58.31,  shipping:5.49, stock:0, stockExternal:166, delivery:"1-3 Werktage", sku:"BPA1124DABBT",    supplier:"Mediaelectronics Spain", images:["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80"], description:"1-DIN, DAB+, Bluetooth, 2× USB, RDS. Einstieg ins Digitalradio. Inkl. kostenlosem Versand." },
];

const genId = () => "MKE-" + Date.now().toString(36).toUpperCase();
const fmt = (n) => Number(n).toFixed(2).replace(".", ",") + " €";
const fmtDate = () => new Date().toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });

// Bestellbenachrichtigung per Formspree an shop@mk-electro.com
async function sendOrderNotification(order) {
  try {
    const itemsList = (order.items || [])
      .map(i => `• ${i.name} × ${i.qty} = ${fmt(i.price * i.qty)}`)
      .join("\n");
    await fetch("https://formspree.io/f/mzdwqkoa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _subject: `🛒 Neue Bestellung ${order.id} — ${fmt(order.total)}`,
        bestellung_nr: order.id,
        datum: order.date,
        kunde_name: order.customer?.name,
        kunde_email: order.customer?.email,
        kunde_adresse: `${order.customer?.street}, ${order.customer?.zip} ${order.customer?.city}`,
        zahlungsart: order.payment === "paypal" ? "PayPal" : "Vorkasse",
        gesamtbetrag: fmt(order.total),
        artikel: itemsList,
        message: `Neue Bestellung eingegangen!\n\nBestellung: ${order.id}\nKunde: ${order.customer?.name}\nE-Mail: ${order.customer?.email}\nAdresse: ${order.customer?.street}, ${order.customer?.zip} ${order.customer?.city}\nZahlung: ${order.payment === "paypal" ? "PayPal" : "Vorkasse"}\n\nArtikel:\n${itemsList}\n\nGesamt: ${fmt(order.total)}`,
      }),
    });
  } catch(e) {
    console.error("Bestellbenachrichtigung fehlgeschlagen:", e);
  }
}

// Echte Nettomarge nach eBay (10.75% + 0.35€) und Versand
function calcMargin(price, ek, shipping) {
  const p = parseFloat(price)||0, e = parseFloat(ek)||0, s = parseFloat(shipping)||0;
  if (!p || !e) return null;
  const ebay = p * 0.1075 + 0.35;
  const netto = p - ebay - s - e;
  return { netto: Math.round(netto*100)/100, pct: Math.round(netto/e*1000)/10, ebay: Math.round(ebay*100)/100 };
}

// ── Icon system ───────────────────────────────────────────────────────────────
const I = ({ d, size=18, sw=1.75, fill="none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {[].concat(d).map((p,i)=><path key={i} d={p}/>)}
  </svg>
);
const ICONS = {
  cart:   "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
  plus:   "M12 5v14M5 12h14",
  minus:  "M5 12h14",
  trash:  "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  truck:  "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  check:  "M20 6L9 17l-5-5",
  x:      "M18 6L6 18M6 6l12 12",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  home:   "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  box:    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  orders: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  image:  "M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
  mail:   "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  invoice:"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  eye:    "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  chev:   "M9 18l6-6-6-6",
  tag:    "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  print:  "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
  link:   "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  phone:  "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .93h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  mappin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  doc:    "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  scale:  "M12 3v18M3 9l4-4 4 4M17 9l4-4-4-4M3 15l4 4 4-4M17 15l4 4-4 4",
  newsletter:"M22 12h-4l-3 9L9 3l-3 9H2",
  user:   "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  users:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#07090d;--sf:#0f1218;--sf2:#161b23;--sf3:#1e2530;
  --acc:#e8a020;--acc2:#e03010;--tx:#eef1f6;--mu:#6e7d96;
  --br:#232c3a;--ok:#22c55e;--err:#ef4444;--inf:#3b82f6;--r:8px;
}
body{font-family:'Barlow',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh}
button,input,select,textarea{font-family:inherit;border:none;outline:none}
button{cursor:pointer} img{max-width:100%} a{color:inherit;text-decoration:none}
.app{display:flex;flex-direction:column;min-height:100vh}

/* NAV */
.nav{background:var(--sf);border-bottom:1px solid var(--br);padding:0 1.8rem;display:flex;align-items:center;gap:1.2rem;height:58px;position:sticky;top:0;z-index:100;box-shadow:0 2px 20px rgba(0,0,0,.45)}
.logo{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.5rem;letter-spacing:.5px;display:flex;align-items:baseline;gap:.2rem}
.logo em{color:var(--acc);font-style:normal}
.logo small{font-size:.6rem;color:var(--mu);font-weight:400;margin-left:.3rem}
.nav-links{display:flex;gap:.15rem;margin-left:auto}
.nb{background:none;color:var(--mu);padding:.38rem .8rem;border-radius:var(--r);font-size:.85rem;font-weight:500;display:flex;align-items:center;gap:.38rem;transition:all .18s}
.nb:hover,.nb.on{background:var(--sf2);color:var(--tx)}
.cart-btn{background:var(--acc);color:#000;padding:.38rem .95rem;border-radius:var(--r);font-weight:700;font-size:.85rem;display:flex;align-items:center;gap:.38rem}
.cart-btn:hover{background:#d09010}
.badge{background:var(--acc2);color:#fff;font-size:.65rem;font-weight:700;border-radius:99px;padding:.08rem .36rem;min-width:15px;text-align:center}

/* HERO */
.hero{background:linear-gradient(150deg,#050709 0%,#160d00 55%,#050709 100%);padding:4rem 2rem;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 65% 45% at 50% 110%,rgba(232,160,32,.16),transparent)}
.hero::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,32,.35),transparent)}
.hero-tag{display:inline-flex;align-items:center;gap:.45rem;background:rgba(232,160,32,.1);color:var(--acc);border:1px solid rgba(232,160,32,.22);padding:.28rem .9rem;border-radius:99px;font-size:.72rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:1.1rem}
.hero h1{font-family:'Barlow Condensed',sans-serif;font-size:clamp(2.5rem,6vw,4.5rem);font-weight:900;line-height:1.03;margin-bottom:.85rem;text-transform:uppercase}
.hero h1 em{color:var(--acc);font-style:normal}
.hero p{color:var(--mu);font-size:.97rem;max-width:480px;margin:0 auto 1.7rem;line-height:1.6}
.hero-btns{display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap}

/* BUTTONS */
.btn{padding:.55rem 1.3rem;border-radius:var(--r);font-weight:600;font-size:.9rem;display:inline-flex;align-items:center;gap:.42rem;cursor:pointer;transition:all .18s;border:none}
.btn-p{background:var(--acc);color:#000}.btn-p:hover{background:#d09010;transform:translateY(-1px)}
.btn-o{background:transparent;color:var(--tx);border:1px solid var(--br)}.btn-o:hover{border-color:var(--acc);color:var(--acc)}
.btn-d{background:var(--err);color:#fff}.btn-d:hover{background:#c53030}
.btn-ok{background:var(--ok);color:#fff}.btn-ok:hover{background:#16a34a}
.btn-i{background:var(--inf);color:#fff}.btn-i:hover{background:#2563eb}
.btn-sm{padding:.32rem .72rem;font-size:.78rem}

/* FILTERS */
.filters{padding:1.1rem 1.8rem;display:flex;gap:.8rem;flex-wrap:wrap;align-items:center;background:var(--sf);border-bottom:1px solid var(--br)}
.sw{position:relative;flex:1;min-width:180px;max-width:300px}
.sw svg{position:absolute;left:.7rem;top:50%;transform:translateY(-50%);color:var(--mu);pointer-events:none}
.si{width:100%;background:var(--sf2);border:1px solid var(--br);color:var(--tx);padding:.48rem .85rem .48rem 2.2rem;border-radius:var(--r);font-size:.86rem}
.si:focus{border-color:var(--acc)}
.chips{display:flex;gap:.35rem;flex-wrap:wrap}
.chip{padding:.3rem .75rem;border-radius:99px;font-size:.78rem;font-weight:600;border:1px solid var(--br);background:none;color:var(--mu);transition:all .18s}
.chip:hover{border-color:var(--acc);color:var(--acc)}.chip.on{background:var(--acc);color:#000;border-color:var(--acc)}

/* PRODUCT GRID */
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:1.3rem;padding:1.6rem 1.8rem}
.pcard{background:var(--sf);border:1px solid var(--br);border-radius:12px;overflow:hidden;transition:transform .2s,box-shadow .2s,border-color .2s;display:flex;flex-direction:column}
.pcard:hover{transform:translateY(-4px);box-shadow:0 14px 45px rgba(0,0,0,.55);border-color:rgba(232,160,32,.22)}
.pcard-img-wrap{position:relative;width:100%;height:190px;overflow:hidden;background:var(--sf2)}
.pcard-img{width:100%;height:100%;object-fit:cover;transition:transform .3s}
.pcard:hover .pcard-img{transform:scale(1.04)}
.img-count{position:absolute;bottom:.5rem;right:.5rem;background:rgba(0,0,0,.65);color:#fff;border-radius:4px;font-size:.68rem;font-weight:700;padding:.15rem .4rem;display:flex;align-items:center;gap:.25rem}
.pcard-body{padding:.9rem;flex:1;display:flex;flex-direction:column;gap:.4rem}
.pcat{font-size:.68rem;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:1px}
.pname{font-family:'Barlow Condensed',sans-serif;font-size:1.08rem;font-weight:700;line-height:1.2}
.psku{font-size:.68rem;color:var(--mu);font-family:monospace}
.pdesc{font-size:.78rem;color:var(--mu);line-height:1.5;flex:1}
.pfoot{display:flex;align-items:center;justify-content:space-between;margin-top:.65rem;padding-top:.65rem;border-top:1px solid var(--br)}
.pprice{font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900;color:var(--acc)}
.sbadge{font-size:.68rem;font-weight:600;padding:.18rem .45rem;border-radius:4px}
.sok{background:rgba(34,197,94,.14);color:var(--ok)}.slow{background:rgba(232,160,32,.14);color:var(--acc)}.sout{background:rgba(239,68,68,.14);color:var(--err)}
.dliv{font-size:.7rem;color:var(--mu);display:flex;align-items:center;gap:.28rem}

/* IMAGE GALLERY DOTS */
.img-dots{display:flex;gap:.3rem;justify-content:center;padding:.4rem;background:var(--sf2)}
.img-dot{width:6px;height:6px;border-radius:50%;background:var(--br);transition:background .2s;cursor:pointer;border:none}
.img-dot.on{background:var(--acc)}

/* CART */
.ov{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:199;backdrop-filter:blur(4px)}
.cart-sb{position:fixed;right:0;top:0;bottom:0;width:min(420px,95vw);background:var(--sf);z-index:200;display:flex;flex-direction:column;box-shadow:-8px 0 50px rgba(0,0,0,.6)}
.sb-hdr{padding:1rem 1.3rem;border-bottom:1px solid var(--br);display:flex;align-items:center;justify-content:space-between}
.sb-hdr h2{font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:900;text-transform:uppercase}
.xbtn{background:var(--sf2);border:1px solid var(--br);color:var(--mu);width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
.xbtn:hover{color:var(--tx)}
.cart-items{flex:1;overflow-y:auto;padding:.85rem}
.citem{display:flex;gap:.65rem;padding:.65rem;background:var(--sf2);border-radius:8px;margin-bottom:.65rem}
.citem img{width:56px;height:56px;border-radius:6px;object-fit:cover;flex-shrink:0}
.cinfo{flex:1;min-width:0}
.cname{font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cprice{font-size:.78rem;color:var(--acc);font-weight:700;margin-top:.12rem}
.qc{display:flex;align-items:center;gap:.3rem;margin-top:.38rem}
.qb{background:var(--sf3);border:1px solid var(--br);color:var(--tx);width:20px;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
.qb:hover{background:var(--acc);color:#000}.qn{font-size:.8rem;font-weight:700;min-width:16px;text-align:center}
.cart-ft{padding:1rem 1.3rem;border-top:1px solid var(--br)}
.ctotal{display:flex;justify-content:space-between;align-items:center;margin-bottom:.85rem}
.ctotal span:first-child{color:var(--mu);font-size:.86rem}
.ctotal span:last-child{font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;color:var(--acc)}

/* CHECKOUT */
.chk-ov{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:300;padding:1rem}
.chk-box{background:var(--sf);border:1px solid var(--br);border-radius:16px;width:min(550px,100%);max-height:90vh;overflow-y:auto;padding:1.7rem}
.chk-box h2{font-family:'Barlow Condensed',sans-serif;font-size:1.65rem;font-weight:900;margin-bottom:1.3rem}
.fg{margin-bottom:.85rem}
.fg label{display:block;font-size:.75rem;font-weight:700;color:var(--mu);margin-bottom:.32rem;text-transform:uppercase;letter-spacing:.5px}
.fi{width:100%;background:var(--sf2);border:1px solid var(--br);color:var(--tx);padding:.58rem .82rem;border-radius:var(--r);font-size:.86rem}
.fi:focus{border-color:var(--acc)} .fi.err{border-color:var(--err)!important}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:.85rem}
.pay-opts{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-top:.45rem}
.popt{border:2px solid var(--br);border-radius:10px;padding:.75rem;cursor:pointer;text-align:center;transition:all .2s;background:var(--sf2)}
.popt:hover{border-color:var(--acc)}.popt.on{border-color:var(--acc);background:rgba(232,160,32,.09)}
.popt-lbl{font-weight:700;font-size:.86rem;margin-top:.32rem}.popt-sub{font-size:.7rem;color:var(--mu)}
.pp-logo{font-weight:900;font-size:1rem;color:#003087}.pp-logo span{color:#009cde}
.sec-ttl{font-family:'Barlow Condensed',sans-serif;font-size:.95rem;font-weight:800;text-transform:uppercase;color:var(--mu);letter-spacing:1px;margin-bottom:.6rem;margin-top:1.2rem}
.ord-sum{background:var(--sf2);border-radius:10px;padding:.85rem;margin-top:.75rem}
.srow{display:flex;justify-content:space-between;font-size:.83rem;padding:.18rem 0}
.stotal{font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:900;color:var(--acc);border-top:1px solid var(--br);margin-top:.45rem;padding-top:.45rem}
.chk-acts{display:flex;gap:.65rem;margin-top:1.3rem}

/* SUCCESS */
.succ-scr{text-align:center;padding:1.8rem 1rem}
.succ-ic{width:56px;height:56px;background:rgba(34,197,94,.18);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.2rem;color:var(--ok)}
.succ-scr h2{font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:900;margin-bottom:.65rem}
.ord-id{background:var(--sf2);border:1px solid var(--br);border-radius:8px;padding:.6rem 1rem;margin:1rem auto;font-family:monospace;font-size:.85rem;color:var(--acc);display:inline-flex;align-items:center;gap:.6rem}
.bank-box{background:var(--sf2);border:1px solid var(--br);border-radius:10px;padding:1.1rem 1.2rem;margin:1rem 0;text-align:left}
.bank-box p{font-size:.78rem;margin:.18rem 0}
.bank-box strong{color:var(--tx)}.bank-box span{color:var(--mu)}
.bank-row{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem .7rem;background:var(--sf);border-radius:7px;margin:.4rem 0}
.bank-row-label{font-size:.68rem;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.15rem}
.bank-row-value{font-size:.92rem;font-weight:700;color:var(--tx);font-family:monospace;letter-spacing:.5px}
.copy-btn{background:var(--sf3);border:1px solid var(--br);color:var(--mu);border-radius:5px;padding:.25rem .55rem;font-size:.7rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:.25rem;flex-shrink:0;transition:all .18s;white-space:nowrap}
.copy-btn:hover{background:var(--acc);border-color:var(--acc);color:#000}
.copy-btn.copied{background:var(--ok);border-color:var(--ok);color:#fff}


/* TRUST / FOOTER */
.trust{background:var(--sf);border-top:1px solid var(--br);padding:1.2rem 1.8rem;display:flex;justify-content:center;gap:2.2rem;flex-wrap:wrap}
.ti{display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:var(--mu)}
.ti svg{color:var(--acc)}
footer{background:var(--sf);border-top:1px solid var(--br)}
.footer-main{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:2rem;padding:2rem 1.8rem}
.footer-col h4{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1rem;text-transform:uppercase;letter-spacing:1px;color:var(--tx);margin-bottom:.8rem}
.footer-col p,.footer-col a{font-size:.8rem;color:var(--mu);line-height:1.8;display:block}
.footer-col a:hover{color:var(--acc)}
.footer-bottom{border-top:1px solid var(--br);padding:.9rem 1.8rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem}
.footer-bottom span{font-size:.75rem;color:var(--mu)}
.footer-bottom-links{display:flex;gap:1.2rem}
.footer-bottom-links button{background:none;border:none;color:var(--mu);font-size:.75rem;cursor:pointer;transition:color .15s}
.footer-bottom-links button:hover{color:var(--acc)}

/* LEGAL / CONTACT PAGES */
.page-wrap{max-width:860px;margin:0 auto;padding:2.5rem 1.8rem}
.page-hero{background:linear-gradient(150deg,#050709 0%,#0d0800 60%,#050709 100%);padding:3rem 1.8rem;position:relative;overflow:hidden;border-bottom:1px solid var(--br)}
.page-hero::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,32,.3),transparent)}
.page-hero-inner{max-width:860px;margin:0 auto}
.page-hero-tag{display:inline-flex;align-items:center;gap:.4rem;background:rgba(232,160,32,.1);color:var(--acc);border:1px solid rgba(232,160,32,.2);padding:.22rem .75rem;border-radius:99px;font-size:.7rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:.8rem}
.page-hero h1{font-family:'Barlow Condensed',sans-serif;font-size:clamp(1.9rem,4vw,3rem);font-weight:900;text-transform:uppercase;line-height:1.05}
.page-hero p{color:var(--mu);font-size:.9rem;margin-top:.5rem}

/* LEGAL TEXT */
.legal-section{margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid var(--br)}
.legal-section:last-child{border-bottom:none}
.legal-section h2{font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:800;text-transform:uppercase;color:var(--acc);letter-spacing:.5px;margin-bottom:.7rem;display:flex;align-items:center;gap:.5rem}
.legal-section h3{font-size:.95rem;font-weight:700;color:var(--tx);margin:.8rem 0 .35rem}
.legal-section p{font-size:.85rem;color:var(--mu);line-height:1.75;margin-bottom:.5rem}
.legal-section ul{padding-left:1.2rem;margin:.4rem 0 .6rem}
.legal-section ul li{font-size:.85rem;color:var(--mu);line-height:1.75;margin-bottom:.2rem}
.legal-section a{color:var(--acc);text-decoration:underline}
.legal-highlight{background:var(--sf2);border:1px solid var(--br);border-radius:8px;padding:1rem 1.2rem;margin:.8rem 0}
.legal-highlight p{margin:0}

/* IMPRESSUM CONTACT CARD */
.imp-card{background:var(--sf);border:1px solid var(--br);border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;display:grid;grid-template-columns:auto 1fr;gap:1rem;align-items:start}
.imp-card-icon{width:42px;height:42px;background:rgba(232,160,32,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--acc);flex-shrink:0}
.imp-card h3{font-size:.85rem;font-weight:700;color:var(--tx);margin-bottom:.35rem}
.imp-card p{font-size:.82rem;color:var(--mu);line-height:1.7;margin:0}
.imp-card a{color:var(--acc)}

/* CONTACT FORM */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start}
@media(max-width:640px){.contact-grid{grid-template-columns:1fr}}
.contact-info-card{background:var(--sf);border:1px solid var(--br);border-radius:12px;padding:1.5rem}
.contact-info-card h3{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;text-transform:uppercase;margin-bottom:1rem;color:var(--tx)}
.cinfo-row{display:flex;align-items:flex-start;gap:.75rem;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--br)}
.cinfo-row:last-child{border:none;margin:0;padding:0}
.cinfo-icon{width:34px;height:34px;background:rgba(232,160,32,.1);border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--acc);flex-shrink:0}
.cinfo-row h4{font-size:.78rem;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.15rem}
.cinfo-row p,.cinfo-row a{font-size:.84rem;color:var(--tx);line-height:1.5}
.cinfo-row a{color:var(--acc)}
.contact-form-card{background:var(--sf);border:1px solid var(--br);border-radius:12px;padding:1.5rem}
.contact-form-card h3{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;text-transform:uppercase;margin-bottom:1rem;color:var(--tx)}
.form-sent{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:10px;padding:1.5rem;text-align:center}
.form-sent h3{font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:900;color:var(--ok);margin:.8rem 0 .5rem}
.form-sent p{font-size:.84rem;color:var(--mu)}
.subject-chips{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem}
.subject-chip{padding:.3rem .7rem;border-radius:99px;font-size:.76rem;font-weight:600;border:1px solid var(--br);background:none;color:var(--mu);cursor:pointer;transition:all .18s}
.subject-chip:hover,.subject-chip.on{background:rgba(232,160,32,.1);border-color:var(--acc);color:var(--acc)}


/* ── BACKEND ─────────────────────────────────────────────────────────── */
.be-wrap{display:flex;min-height:calc(100vh - 58px)}
.be-side{width:205px;background:var(--sf);border-right:1px solid var(--br);padding:1.1rem 0;flex-shrink:0}
.be-side-ttl{font-size:.65rem;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:1.5px;padding:.4rem 1.2rem;margin-bottom:.2rem}
.bni{display:flex;align-items:center;gap:.5rem;padding:.58rem 1.2rem;font-size:.86rem;font-weight:500;color:var(--mu);cursor:pointer;transition:all .15s;border-left:3px solid transparent}
.bni:hover{background:var(--sf2);color:var(--tx)}.bni.on{background:rgba(232,160,32,.07);color:var(--acc);border-left-color:var(--acc)}
.be-ct{flex:1;padding:1.7rem;overflow:auto}
.be-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.7rem}
.be-ttl{font-family:'Barlow Condensed',sans-serif;font-size:1.85rem;font-weight:900;text-transform:uppercase}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:.9rem;margin-bottom:1.7rem}
.sc{background:var(--sf);border:1px solid var(--br);border-radius:10px;padding:1rem}
.sc-lbl{font-size:.72rem;font-weight:600;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.32rem}
.sc-val{font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:900;color:var(--acc)}
.sc-sub{font-size:.72rem;color:var(--mu);margin-top:.12rem}
.tbl-wrap{background:var(--sf);border:1px solid var(--br);border-radius:12px;overflow:hidden}
.tbl{width:100%;border-collapse:collapse}
.tbl th{background:var(--sf2);padding:.65rem .9rem;text-align:left;font-size:.7rem;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--br)}
.tbl td{padding:.75rem .9rem;border-bottom:1px solid var(--br);font-size:.84rem;vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}.tbl tr:hover td{background:var(--sf2)}
.thumb{width:36px;height:36px;border-radius:6px;object-fit:cover}
.acts{display:flex;gap:.4rem;flex-wrap:wrap}
.spill{padding:.2rem .55rem;border-radius:99px;font-size:.68rem;font-weight:700}
.s-new{background:rgba(232,160,32,.14);color:var(--acc)}
.s-paid{background:rgba(34,197,94,.14);color:var(--ok)}
.s-ship{background:rgba(59,130,246,.14);color:var(--inf)}
.s-canc{background:rgba(239,68,68,.14);color:var(--err)}
.mgchip{background:rgba(34,197,94,.12);color:var(--ok);border-radius:4px;padding:.08rem .38rem;font-size:.68rem;font-weight:700;margin-left:.38rem}

/* MODAL */
.mkov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:400;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)}
.mkbox{background:var(--sf);border:1px solid var(--br);border-radius:16px;width:min(660px,100%);max-height:92vh;overflow-y:auto;padding:1.7rem}
.mkbox h2{font-family:'Barlow Condensed',sans-serif;font-size:1.55rem;font-weight:900;margin-bottom:1.3rem}
.mk-acts{display:flex;gap:.65rem;margin-top:1.3rem;justify-content:flex-end}

/* IMAGE UPLOAD */
.img-upload-area{border:2px dashed var(--br);border-radius:10px;padding:1.5rem;text-align:center;cursor:pointer;transition:all .2s;position:relative;background:var(--sf2)}
.img-upload-area:hover,.img-upload-area.drag{border-color:var(--acc);background:rgba(232,160,32,.05)}
.img-upload-area input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.img-upload-txt{color:var(--mu);font-size:.83rem;margin-top:.5rem}
.img-upload-txt strong{color:var(--acc)}
.img-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:.6rem;margin-top:.8rem}
.img-item{position:relative;border-radius:8px;overflow:hidden;border:2px solid var(--br);aspect-ratio:1;background:var(--sf3)}
.img-item img{width:100%;height:100%;object-fit:cover}
.img-item.primary{border-color:var(--acc)}
.img-item-actions{position:absolute;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;gap:.4rem;opacity:0;transition:opacity .2s}
.img-item:hover .img-item-actions{opacity:1}
.img-primary-badge{position:absolute;top:.28rem;left:.28rem;background:var(--acc);color:#000;font-size:.6rem;font-weight:700;padding:.1rem .35rem;border-radius:3px}
.img-count-badge{position:absolute;bottom:.28rem;right:.28rem;background:rgba(0,0,0,.7);color:#fff;font-size:.6rem;font-weight:700;padding:.1rem .35rem;border-radius:3px}

/* ORDER DETAIL + INVOICE */
.od-sec{margin-bottom:1.3rem}
.od-sec h3{font-family:'Barlow Condensed',sans-serif;font-size:.98rem;font-weight:800;color:var(--mu);text-transform:uppercase;margin-bottom:.6rem}
.od-grid{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}
.od-f label{font-size:.68rem;color:var(--mu);text-transform:uppercase;letter-spacing:.5px}
.od-f p{font-size:.86rem;font-weight:500;margin-top:.1rem}
.od-items{background:var(--sf2);border-radius:8px;padding:.85rem}
.od-item{display:flex;justify-content:space-between;align-items:flex-start;font-size:.83rem;padding:.35rem 0;border-bottom:1px solid var(--br);gap:.5rem}
.od-item:last-child{border:none}
.od-total{display:flex;justify-content:space-between;font-family:'Barlow Condensed',sans-serif;font-size:1.18rem;font-weight:900;color:var(--acc);margin-top:.6rem;padding-top:.6rem;border-top:1px solid var(--br)}
.od-serial{font-size:.72rem;color:var(--mu);margin-top:.18rem;font-family:monospace}
.tracking-chip{display:inline-flex;align-items:center;gap:.35rem;background:rgba(59,130,246,.1);color:var(--inf);border:1px solid rgba(59,130,246,.2);border-radius:6px;padding:.25rem .6rem;font-size:.75rem;font-family:monospace;font-weight:600;margin-top:.4rem;cursor:pointer}
.tracking-chip:hover{background:rgba(59,130,246,.2)}
select.fi{appearance:auto}

/* PAYPAL */
.paypal-btn-wrap{margin-top:.75rem;border-radius:var(--r);overflow:hidden;min-height:50px;background:#ffc439;border-radius:6px}
.pay-processing{display:flex;align-items:center;justify-content:center;gap:.6rem;padding:1rem;background:rgba(232,160,32,.08);border:1px solid rgba(232,160,32,.2);border-radius:var(--r);font-size:.85rem;color:var(--acc)}
.pay-error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:var(--r);padding:.75rem 1rem;font-size:.82rem;color:var(--err);margin-top:.5rem}

/* CHECKOUT STEPS */
.chk-steps{display:flex;align-items:center;gap:0;margin-bottom:1.5rem}
.chk-step{display:flex;align-items:center;gap:.4rem;font-size:.75rem;font-weight:600;color:var(--mu);flex:1}
.chk-step.done{color:var(--ok)}.chk-step.active{color:var(--acc)}
.chk-step-num{width:22px;height:22px;border-radius:50%;border:2px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;flex-shrink:0}
.chk-step-line{flex:1;height:1px;background:var(--br);margin:0 .3rem}

/* CONFIRMATION SUMMARY */
.conf-block{background:var(--sf2);border:1px solid var(--br);border-radius:10px;padding:1rem 1.1rem;margin-bottom:.85rem}
.conf-block h4{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:.95rem;text-transform:uppercase;color:var(--mu);letter-spacing:.5px;margin-bottom:.6rem;display:flex;align-items:center;gap:.4rem}
.conf-row{display:flex;justify-content:space-between;font-size:.83rem;padding:.2rem 0}
.conf-row span:first-child{color:var(--mu)}
.conf-row span:last-child{font-weight:500}
.conf-total{display:flex;justify-content:space-between;font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:900;color:var(--acc);border-top:1px solid var(--br);margin-top:.5rem;padding-top:.5rem}

/* CHECKBOXES */
.chk-consent{margin:.5rem 0}
.chk-consent-row{display:flex;align-items:flex-start;gap:.65rem;padding:.6rem .75rem;border-radius:8px;border:1px solid var(--br);background:var(--sf2);margin-bottom:.45rem;cursor:pointer;transition:border-color .15s}
.chk-consent-row:hover{border-color:var(--acc)}
.chk-consent-row.required.checked{border-color:var(--ok)}
.chk-consent-row.err-border{border-color:var(--err)!important}
.chk-box-input{width:18px;height:18px;border:2px solid var(--br);border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:.1rem;transition:all .15s;background:var(--sf)}
.chk-box-input.checked{background:var(--ok);border-color:var(--ok)}
.chk-box-input.checked-opt{background:var(--acc);border-color:var(--acc)}
.chk-consent-txt{font-size:.78rem;color:var(--mu);line-height:1.55}
.chk-consent-txt strong{color:var(--tx)}
.chk-consent-txt a{color:var(--acc);text-decoration:underline;cursor:pointer}



/* INVOICE PREVIEW */
.inv-preview{background:#fff;color:#111;border-radius:10px;padding:2rem;font-size:.82rem;line-height:1.6;font-family:'Barlow',sans-serif}
.inv-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:2px solid #e8a020}
.inv-company{font-family:'Barlow Condensed',sans-serif}
.inv-company h2{font-size:1.6rem;font-weight:900;color:#e8a020;margin-bottom:.2rem}
.inv-company p{font-size:.75rem;color:#555}
.inv-meta{text-align:right;font-size:.75rem;color:#555}
.inv-meta strong{display:block;font-size:1rem;color:#111;font-family:'Barlow Condensed',sans-serif;font-weight:900}
.inv-addrs{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.4rem}
.inv-addr h4{font-size:.7rem;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:.3rem}
.inv-addr p{font-size:.82rem;color:#222}
.inv-tbl{width:100%;border-collapse:collapse;margin-bottom:1.2rem}
.inv-tbl th{background:#f5f5f5;padding:.5rem .7rem;text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:2px solid #e8a020}
.inv-tbl td{padding:.45rem .7rem;border-bottom:1px solid #eee;font-size:.8rem}
.inv-tbl tfoot td{border-top:2px solid #e8a020;font-weight:700;font-size:.88rem}
.inv-footer{margin-top:1.2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.72rem;color:#888;text-align:center}
.inv-bank{background:#fffbf2;border:1px solid #e8a020;border-radius:6px;padding:.7rem;margin:.8rem 0;font-size:.75rem}
.inv-bank strong{color:#e8a020}
.mail-sent{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:.7rem 1rem;display:flex;align-items:center;gap:.6rem;font-size:.83rem;color:var(--ok);margin-top:.8rem}

/* PRODUCT DETAIL MODAL */
.pd-modal{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:350;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(8px)}
.pd-box{background:var(--sf);border:1px solid var(--br);border-radius:18px;width:min(920px,100%);max-height:94vh;overflow:hidden;display:grid;grid-template-columns:1.1fr 1fr;position:relative}
@media(max-width:660px){.pd-box{grid-template-columns:1fr;max-height:96vh;overflow-y:auto}}
.pd-gallery{position:relative;background:#0a0c10;border-radius:18px 0 0 18px;display:flex;flex-direction:column;overflow:hidden}
@media(max-width:660px){.pd-gallery{border-radius:18px 18px 0 0}}
.pd-main-wrap{flex:1;display:flex;align-items:center;justify-content:center;padding:1.2rem;min-height:0;background:#0a0c10}
.pd-main-img{max-width:100%;max-height:420px;width:auto;height:auto;object-fit:contain;display:block;border-radius:8px}
.pd-thumbs{display:flex;gap:.45rem;padding:.65rem .8rem;background:rgba(0,0,0,.5);overflow-x:auto;flex-shrink:0}
.pd-thumbs::-webkit-scrollbar{height:4px}.pd-thumbs::-webkit-scrollbar-thumb{background:var(--br);border-radius:2px}
.pd-thumb{width:58px;height:58px;border-radius:7px;object-fit:cover;flex-shrink:0;cursor:pointer;border:2px solid transparent;transition:all .18s;opacity:.55}
.pd-thumb.on{border-color:var(--acc);opacity:1;transform:scale(1.05)}
.pd-thumb:hover{opacity:.9}
.pd-nav-btn{position:absolute;top:calc(50% - 28px);transform:translateY(-50%);background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.1);color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s;z-index:2;flex-shrink:0}
.pd-nav-btn:hover{background:var(--acc);border-color:var(--acc);color:#000}
.pd-nav-left{left:.7rem} .pd-nav-right{right:.7rem}
.pd-info{padding:1.8rem 1.8rem 1.8rem 1.6rem;display:flex;flex-direction:column;gap:.9rem;overflow-y:auto;max-height:94vh}
.pd-cat{font-size:.7rem;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:1.5px}
.pd-name{font-family:'Barlow Condensed',sans-serif;font-size:1.7rem;font-weight:900;line-height:1.1}
.pd-sku{font-size:.7rem;color:var(--mu);font-family:monospace}
.pd-desc{font-size:.85rem;color:var(--mu);line-height:1.7}
.pd-divider{height:1px;background:var(--br);margin:.1rem 0}
.pd-price-row{display:flex;align-items:baseline;gap:.75rem;flex-wrap:wrap}
.pd-price{font-family:'Barlow Condensed',sans-serif;font-size:2.2rem;font-weight:900;color:var(--acc)}
.pd-vat{font-size:.73rem;color:var(--mu)}
.pd-close{position:absolute;top:.75rem;right:.75rem;background:rgba(0,0,0,.6);border:1px solid var(--br);color:var(--mu);width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;transition:all .18s}
.pd-close:hover{background:var(--err);border-color:var(--err);color:#fff}
.pd-features{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}
.pd-feature{background:var(--sf2);border-radius:8px;padding:.5rem .75rem}
.pd-feature-lbl{color:var(--mu);font-size:.65rem;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.12rem}
.pd-feature-val{font-weight:600;color:var(--tx);font-size:.82rem}
.pcard{cursor:pointer}
.pcard-click-hint{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.55));color:#fff;font-size:.72rem;text-align:center;padding:.5rem;opacity:0;transition:opacity .2s}
.pcard:hover .pcard-click-hint{opacity:1}

/* NEWSLETTER & USER MGMT */
.nl-badge{display:inline-flex;align-items:center;gap:.28rem;background:rgba(59,130,246,.12);color:var(--inf);border:1px solid rgba(59,130,246,.25);border-radius:99px;padding:.15rem .55rem;font-size:.68rem;font-weight:700}
.nl-unsub{display:inline-flex;align-items:center;gap:.28rem;background:rgba(239,68,68,.08);color:var(--err);border:1px solid rgba(239,68,68,.2);border-radius:99px;padding:.15rem .55rem;font-size:.68rem;font-weight:600}
.del-confirm-box{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:1.1rem;margin-top:.8rem}

.auth-wrap{min-height:calc(100vh - 58px);display:flex;align-items:center;justify-content:center;padding:2rem;background:var(--bg)}
.auth-box{background:var(--sf);border:1px solid var(--br);border-radius:16px;width:min(440px,100%);padding:2rem}
.auth-box h2{font-family:'Barlow Condensed',sans-serif;font-size:1.7rem;font-weight:900;margin-bottom:.4rem}
.auth-box p{color:var(--mu);font-size:.85rem;margin-bottom:1.4rem}
.auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:0;background:var(--sf2);border-radius:8px;padding:.2rem;margin-bottom:1.3rem}
.auth-tab{padding:.5rem;border-radius:6px;font-size:.85rem;font-weight:600;cursor:pointer;text-align:center;color:var(--mu);transition:all .18s;background:none;border:none}
.auth-tab.on{background:var(--sf);color:var(--tx);box-shadow:0 1px 4px rgba(0,0,0,.3)}
.auth-err{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:.65rem .9rem;font-size:.8rem;color:var(--err);margin-bottom:.8rem;display:flex;align-items:center;gap:.5rem}
.auth-ok{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);border-radius:8px;padding:.65rem .9rem;font-size:.8rem;color:var(--ok);margin-bottom:.8rem;display:flex;align-items:center;gap:.5rem}

/* CHECKOUT DELIVERY ADDRESS */
.delivery-toggle{display:flex;align-items:center;gap:.7rem;padding:.65rem .85rem;background:var(--sf2);border:1px solid var(--br);border-radius:8px;cursor:pointer;margin-bottom:.75rem;transition:border-color .18s;user-select:none}
.delivery-toggle:hover{border-color:var(--acc)}
.delivery-toggle-box{width:20px;height:20px;border-radius:5px;border:2px solid var(--br);display:flex;align-items:center;justify-content:center;transition:all .18s;flex-shrink:0;background:var(--sf)}
.delivery-toggle-box.on{background:var(--acc);border-color:var(--acc)}
.delivery-toggle-txt{font-size:.84rem;font-weight:600}
.delivery-toggle-sub{font-size:.72rem;color:var(--mu);font-weight:400;margin-top:.05rem}
.autofill-bar{background:rgba(232,160,32,.08);border:1px solid rgba(232,160,32,.2);border-radius:8px;padding:.55rem .85rem;font-size:.78rem;color:var(--acc);display:flex;align-items:center;gap:.5rem;margin-bottom:.85rem}

/* CUSTOMER ACCOUNT PAGE */
.acc-wrap{max-width:860px;margin:0 auto;padding:2rem 1.8rem}
.acc-header{display:flex;align-items:center;gap:1.2rem;margin-bottom:2rem;padding:1.5rem;background:var(--sf);border:1px solid var(--br);border-radius:12px;flex-wrap:wrap}
.acc-avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--acc),#e03010);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.3rem;color:#000;flex-shrink:0}
.acc-name{font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900}
.acc-email{font-size:.82rem;color:var(--mu)}
.acc-order-card{background:var(--sf);border:1px solid var(--br);border-radius:10px;padding:1.1rem 1.2rem;margin-bottom:.9rem;transition:border-color .18s}
.acc-order-card:hover{border-color:rgba(232,160,32,.3)}
.acc-order-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.55rem;flex-wrap:wrap;gap:.5rem}
.acc-order-id{font-family:monospace;font-size:.8rem;color:var(--acc);font-weight:700}
.acc-order-items{font-size:.8rem;color:var(--mu);margin-top:.35rem;line-height:1.6}
.acc-order-total{font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:900;color:var(--acc)}
.acc-status-timeline{display:flex;align-items:flex-start;margin-top:.85rem;padding-top:.75rem;border-top:1px solid var(--br);position:relative}
.acc-tl-step{display:flex;flex-direction:column;align-items:center;flex:1;position:relative}
.acc-tl-dot{width:22px;height:22px;border-radius:50%;border:2px solid var(--br);background:var(--sf2);display:flex;align-items:center;justify-content:center;z-index:1;flex-shrink:0;transition:all .2s}
.acc-tl-dot.done{background:var(--ok);border-color:var(--ok);color:#fff}
.acc-tl-dot.active{background:var(--acc);border-color:var(--acc);color:#000;box-shadow:0 0 0 4px rgba(232,160,32,.2)}
.acc-tl-dot.canc{background:var(--err);border-color:var(--err);color:#fff}
.acc-tl-label{font-size:.63rem;color:var(--mu);margin-top:.3rem;text-align:center;font-weight:600;line-height:1.3}
.acc-tl-label.done{color:var(--ok)}.acc-tl-label.active{color:var(--acc)}.acc-tl-label.canc{color:var(--err)}
.acc-tl-line{flex:1;height:2px;background:var(--br);margin-top:10px}
.acc-tl-line.done{background:var(--ok)}
.acc-empty{text-align:center;padding:3rem;color:var(--mu)}

/* CUSTOMER MANAGEMENT */
.cust-card:hover{border-color:var(--acc);transform:translateY(-1px);box-shadow:0 6px 24px rgba(0,0,0,.4)}
.cust-card-hdr{display:flex;align-items:center;gap:1rem;margin-bottom:.75rem}
.cust-avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--acc),#e03010);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:#000;flex-shrink:0}
.cust-name{font-weight:700;font-size:.95rem}
.cust-email{font-size:.78rem;color:var(--mu)}
.cust-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.5rem}
.cust-stat{background:var(--sf2);border-radius:6px;padding:.4rem .6rem;text-align:center}
.cust-stat-val{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:900;color:var(--acc)}
.cust-stat-lbl{font-size:.65rem;color:var(--mu);text-transform:uppercase;letter-spacing:.5px}
.cust-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}
.cust-detail-modal .modal-box{width:min(720px,100%)}
.cust-history-item{display:flex;justify-content:space-between;align-items:center;padding:.65rem .85rem;background:var(--sf2);border-radius:8px;margin-bottom:.5rem;cursor:pointer;transition:background .15s}
.cust-history-item:hover{background:var(--sf3)}
.cust-search{display:flex;gap:.75rem;margin-bottom:1.2rem;flex-wrap:wrap}
.cust-filter-btns{display:flex;gap:.4rem;flex-wrap:wrap}


/* STOCK DISPLAY */
.stock-row{display:flex;flex-direction:column;gap:.28rem;margin-top:.3rem}
.stock-line{display:flex;align-items:center;gap:.38rem;font-size:.72rem;font-weight:600}
.stock-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.sd-green{background:#22c55e}
.sd-orange{background:#f97316}
.sd-gray{background:#4b5563}
.ext-badge{display:inline-flex;align-items:center;gap:.28rem;background:rgba(249,115,22,.12);color:#f97316;border:1px solid rgba(249,115,22,.28);border-radius:4px;padding:.12rem .45rem;font-size:.68rem;font-weight:700;white-space:nowrap}
.ext-tag{display:inline-flex;align-items:center;gap:.22rem;background:rgba(249,115,22,.1);color:#f97316;border-radius:3px;padding:.08rem .32rem;font-size:.65rem;font-weight:700}

/* STOCK FORM GRID */
.stock-form-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem}
.stock-preview{background:var(--sf2);border:1px solid var(--br);border-radius:8px;padding:.7rem .9rem;margin-top:.5rem;display:flex;flex-direction:column;gap:.32rem}
.stock-preview-ttl{font-size:.7rem;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.1rem}
`;


// ── Image Upload Component ─────────────────────────────────────────────────────
function ImageUpload({ images = [], onChange }) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleFiles = useCallback(async (files) => {
    const newImgs = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      // Resize to max 800px wide via canvas
      const bmp = await createImageBitmap(f);
      const canvas = document.createElement("canvas");
      const maxW = 800;
      const scale = Math.min(1, maxW / bmp.width);
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL("image/jpeg", 0.82);
      newImgs.push(b64);
    }
    onChange([...images, ...newImgs]);
  }, [images, onChange]);

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    handleFiles(e.dataTransfer.files);
  };
  const setPrimary = (i) => { const a = [...images]; [a[0], a[i]] = [a[i], a[0]]; onChange(a); };
  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className={`img-upload-area${drag ? " drag" : ""}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <input type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} ref={fileRef} />
        <I d={ICONS.upload} size={28} />
        <div className="img-upload-txt">
          <strong>Klicken oder Bilder hier hinziehen</strong><br />
          Einzel- & Mehrfachauswahl möglich · JPG, PNG, WEBP
        </div>
      </div>

      {images.length > 0 && (
        <div className="img-gallery">
          {images.map((src, i) => (
            <div key={i} className={`img-item${i === 0 ? " primary" : ""}`}>
              <img src={src} alt="" />
              {i === 0 && <div className="img-primary-badge">Hauptbild</div>}
              <div className="img-item-actions">
                {i !== 0 && (
                  <button className="btn btn-sm btn-p" style={{padding:".2rem .45rem",fontSize:".65rem"}} onClick={() => setPrimary(i)}>
                    <I d={ICONS.star} size={11} /> Haupt
                  </button>
                )}
                <button className="btn btn-sm btn-d" style={{padding:".2rem .45rem",fontSize:".65rem"}} onClick={() => remove(i)}>
                  <I d={ICONS.trash} size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <div style={{fontSize:".72rem",color:"var(--mu)",marginTop:".5rem"}}>
          {images.length} Bild{images.length!==1?"er":""} · Erstes Bild = Hauptbild im Shop
        </div>
      )}
    </div>
  );
}

// ── Stock info helper (shared between card + backend) ─────────────────────────
function stockInfo(p) {
  const local = Math.max(0, parseInt(p.stock) || 0);
  const ext   = Math.max(0, parseInt(p.stockExternal) || 0);
  const total = local + ext;
  const hasLocal = local > 0;
  const hasExt   = ext > 0;
  // Delivery strings: add 1-2 days for external-only
  const addDays = (str, n) => {
    return str.replace(/(\d+)-(\d+)/, (_, a, b) => `${+a+n}-${+b+n}`)
              .replace(/^(\d+)(?! )/, (_, a) => `${+a+n}`);
  };
  const localDelivery = p.delivery || "1-3 Werktage";
  const extDelivery   = addDays(localDelivery, 2);
  return { local, ext, total, hasLocal, hasExt, localDelivery, extDelivery };
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ p, onAddToCart, onOpenDetail }) {
  const imgs = p.images || [p.image].filter(Boolean);
  const { total } = stockInfo(p);

  return (
    <div className="pcard" onClick={() => onOpenDetail(p)}>
      <div className="pcard-img-wrap" style={{position:"relative"}}>
        <img className="pcard-img"
          src={imgs[0] || "https://placehold.co/600x380/161b23/6e7d96?text=Kein+Bild"}
          alt={p.name}
          onError={e => e.target.src = "https://placehold.co/600x380/161b23/6e7d96?text=Kein+Bild"} />
        {imgs.length > 1 && (
          <div className="img-count"><I d={ICONS.image} size={10}/>{imgs.length} Bilder</div>
        )}
        <div className="pcard-click-hint">🔍 Klicken für Details</div>
      </div>
      <div className="pcard-body">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div className="pcat">{p.category}</div>
          {p.sku && <div className="psku">#{p.sku}</div>}
        </div>
        <div className="pname">{p.name}</div>
        <div className="pdesc" style={{WebkitLineClamp:2,display:"-webkit-box",WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.description}</div>
        <div className="pfoot">
          <div>
            <div className="pprice">{fmt(p.price)}</div>
            <div style={{fontSize:".7rem",color:"var(--mu)"}}>inkl. MwSt. · zzgl. Versand (ab 50 € kostenlos)</div>
          </div>
          <button className="btn btn-p btn-sm"
            onClick={e => { e.stopPropagation(); onAddToCart(p); }}
            disabled={total===0} style={{opacity:total===0?.4:1}}>
            In den Warenkorb
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Detail Modal ──────────────────────────────────────────────────────
function ProductDetailModal({ p, onClose, onAddToCart }) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = p.images?.length ? p.images : [p.image].filter(Boolean);
  const { local, ext, total, hasLocal, hasExt, localDelivery, extDelivery } = stockInfo(p);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const prev = e => { e.stopPropagation(); setImgIdx(i => (i - 1 + imgs.length) % imgs.length); };
  const next = e => { e.stopPropagation(); setImgIdx(i => (i + 1) % imgs.length); };

  return (
    <div className="pd-modal" onClick={onClose}>
      <div className="pd-box" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <div className="pd-close" onClick={onClose}><I d={ICONS.x} size={14}/></div>

        {/* Gallery */}
        <div className="pd-gallery">
          <div className="pd-main-wrap">
            <img className="pd-main-img"
              src={imgs[imgIdx] || "https://placehold.co/600x500/0a0c10/6e7d96?text=Kein+Bild"}
              alt={p.name}
              onError={e => e.target.src = "https://placehold.co/600x500/0a0c10/6e7d96?text=Kein+Bild"}
            />
          </div>
          {imgs.length > 1 && (
            <>
              <button className="pd-nav-btn pd-nav-left" onClick={prev}>
                <I d={ICONS.chev} size={15} sw={2.5} style={{transform:"rotate(180deg)"}}/>
              </button>
              <button className="pd-nav-btn pd-nav-right" onClick={next}>
                <I d={ICONS.chev} size={15} sw={2.5}/>
              </button>
              <div className="pd-thumbs">
                {imgs.map((src, i) => (
                  <img key={i} className={`pd-thumb${i===imgIdx?" on":""}`}
                    src={src} alt="" onClick={() => setImgIdx(i)}
                    onError={e => e.target.src = "https://placehold.co/58x58/1e2530/6e7d96?text=?"} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div className="pd-info">
          <div>
            <div className="pd-cat">{p.category}</div>
            <div className="pd-name">{p.name}</div>
            {p.sku && <div className="pd-sku">Modell: #{p.sku}</div>}
          </div>

          <div className="pd-divider"/>

          <div className="pd-desc">{p.description}</div>

          {/* Features grid */}
          <div className="pd-features">
            <div className="pd-feature">
              <div className="pd-feature-lbl">Lieferzeit (Lager)</div>
              <div className="pd-feature-val">{localDelivery}</div>
            </div>
            {hasExt && (
              <div className="pd-feature">
                <div className="pd-feature-lbl">Lieferzeit (Außenlager)</div>
                <div className="pd-feature-val" style={{color:"#f97316"}}>{extDelivery}</div>
              </div>
            )}
            <div className="pd-feature">
              <div className="pd-feature-lbl">Versand</div>
              <div className="pd-feature-val">Kostenlos (inkl.)</div>
            </div>
            <div className="pd-feature">
              <div className="pd-feature-lbl">Zahlung</div>
              <div className="pd-feature-val">PayPal · Vorkasse</div>
            </div>
          </div>

          <div className="pd-divider"/>

          {/* Stock */}
          <div className="stock-row">
            {hasLocal && (
              <div className="stock-line">
                <span className="stock-dot sd-green"/>
                <span style={{color:"var(--ok)",fontSize:".85rem"}}>
                  {local > 8 ? "Sofort verfügbar" : `Nur noch ${local} Stk. auf Lager`}
                </span>
                <span style={{color:"var(--mu)",marginLeft:"auto",fontSize:".8rem"}}>
                  <I d={ICONS.truck} size={12}/> {localDelivery}
                </span>
              </div>
            )}
            {hasExt && (
              <div className="stock-line">
                <span className="stock-dot sd-orange"/>
                <span style={{color:"#f97316",fontSize:".85rem"}}>
                  {ext} Stk. im <span className="ext-tag">Außenlager</span>
                </span>
                <span style={{color:"var(--mu)",marginLeft:"auto",fontSize:".8rem"}}>
                  <I d={ICONS.truck} size={12}/> {extDelivery}
                </span>
              </div>
            )}
            {!hasLocal && !hasExt && (
              <div className="stock-line">
                <span className="stock-dot sd-gray"/>
                <span style={{color:"var(--mu)"}}>Derzeit nicht verfügbar</span>
              </div>
            )}
          </div>

          <div className="pd-divider"/>

          {/* Price + CTA */}
          <div>
            <div className="pd-price-row">
              <div className="pd-price">{fmt(p.price)}</div>
              <div className="pd-vat">inkl. 19% MwSt. · Versandkostenfrei ab 50 €</div>
            </div>
            <button className="btn btn-p" style={{width:"100%",justifyContent:"center",fontSize:"1rem",marginTop:".85rem",padding:".75rem"}}
              onClick={() => { onAddToCart(p); onClose(); }}
              disabled={total===0} style={{opacity:total===0?.5:1,width:"100%",justifyContent:"center",fontSize:"1rem",marginTop:".85rem",padding:".75rem"}}>
              <I d={ICONS.cart} size={18}/> In den Warenkorb
            </button>
            {total===0 && (
              <div style={{textAlign:"center",fontSize:".78rem",color:"var(--err)",marginTop:".5rem"}}>
                Derzeit nicht verfügbar
              </div>
            )}
          </div>

          {/* Trust */}
          <div style={{display:"flex",gap:".75rem",flexWrap:"wrap",marginTop:"auto"}}>
            {[["Originalware & Garantie",ICONS.check],["Sichere Zahlung",ICONS.shield],["Versandkostenfrei ab 50 €",ICONS.truck]].map(([l,d])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:".3rem",fontSize:".72rem",color:"var(--mu)"}}>
                <I d={d} size={13} style={{color:"var(--acc)"}}/>{l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Generator ─────────────────────────────────────────────────────────
function generateInvoiceHTML(order, invoiceNr) {
  const mwst = 19;
  // Shipping cost: 6€ under 50€ subtotal, free above
  const subtotal = (order.items||[]).reduce((s,i) => s + i.price * i.qty, 0);
  const shipping = order.shipping_cost != null
    ? order.shipping_cost
    : (subtotal >= 50 ? 0 : (subtotal > 0 ? 6 : 0));
  const total = order.total; // already includes shipping
  const netto = total / (1 + mwst/100);
  const mwstBetrag = total - netto;
  const nettoItems = subtotal / (1 + mwst/100);

  // Build serial numbers map: { itemId -> serial }
  const serialMap = {};
  if (order.serial_numbers) {
    (order.serial_numbers).forEach(s => { if (s.serial) serialMap[s.id] = s.serial; });
  }

  const itemsHtml = (order.items || []).map(i => {
    const serial = serialMap[i.id];
    return `
    <tr>
      <td>
        ${i.name}
        ${serial ? `<div style="font-size:.7rem;color:#888;font-family:monospace;margin-top:.2rem">SN: ${serial}</div>` : ""}
      </td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">${fmt(i.price)}</td>
      <td style="text-align:right">${fmt(i.price * i.qty)}</td>
    </tr>`;
  }).join("");

  const shippingRow = shipping > 0
    ? `<tr><td colspan="3">Versandkosten</td><td style="text-align:right">${fmt(shipping)}</td></tr>`
    : `<tr><td colspan="3" style="color:#22c55e">Versandkosten</td><td style="text-align:right;color:#22c55e">Kostenlos</td></tr>`;

  const trackingHtml = (order.carrier || order.tracking_number) ? `
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:.65rem .9rem;margin:.8rem 0;font-size:.78rem;">
      <strong style="color:#0369a1">📦 Versandinformationen</strong><br/>
      ${order.carrier ? `Versanddienstleister: <strong>${order.carrier}</strong><br/>` : ""}
      ${order.tracking_number ? `Trackingnummer: <strong style="font-family:monospace">${order.tracking_number}</strong>` : ""}
    </div>` : "";

  const paymentNote = order.payment === "vorkasse"
    ? `<div class="inv-bank"><strong>Bitte überweisen Sie auf:</strong><br>Kontoinhaber: MK-Electro · Inh. Andreas Kraus · IBAN: DE59 5467 0024 0032 0051 00 · BIC: DEUTDEDB546<br>Verwendungszweck: ${order.id}</div>`
    : `<p style="font-size:.75rem;color:#555">Zahlung per PayPal – Betrag bereits autorisiert.</p>`;

  return `
    <div class="inv-preview" id="invoice-${order.id}">
      <div class="inv-hdr">
        <div class="inv-company">
          <h2>MK·ELECTRO</h2>
          <p>mk-electro.com · Von-Drais-Straße 3a · 68775 Ketsch<br>Tel: +49 (0) 6202 · 123456 · shop@mk-electro.com<br>USt-ID: DE123456789</p>
        </div>
        <div class="inv-meta">
          <strong>RECHNUNG</strong>
          Rechnungsnr.: ${invoiceNr}<br>
          Bestellnr.: ${order.id}<br>
          Datum: ${order.date}<br>
          Zahlungsart: ${order.payment === "paypal" ? "PayPal" : "Vorkasse"}
        </div>
      </div>
      <div class="inv-addrs">
        <div class="inv-addr"><h4>Rechnungsadresse</h4><p>${order.customer?.name}<br>${order.customer?.street}<br>${order.customer?.zip} ${order.customer?.city}</p></div>
        <div class="inv-addr"><h4>Absender</h4><p>MK-Electro<br>Inh. Andreas Kraus<br>Von-Drais-Straße 3a<br>68775 Ketsch</p></div>
      </div>
      <table class="inv-tbl">
        <thead><tr><th>Artikel</th><th style="text-align:center">Menge</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamt</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          ${shippingRow}
          <tr><td colspan="3">Netto (Artikel + Versand)</td><td style="text-align:right">${fmt(netto)}</td></tr>
          <tr><td colspan="3">MwSt. ${mwst}%</td><td style="text-align:right">${fmt(mwstBetrag)}</td></tr>
          <tr style="font-size:1rem"><td colspan="3"><strong>Gesamtbetrag (inkl. MwSt.)</strong></td><td style="text-align:right;color:#e8a020"><strong>${fmt(total)}</strong></td></tr>
        </tfoot>
      </table>
      ${trackingHtml}
      ${paymentNote}
      <div class="inv-footer">Vielen Dank für Ihren Einkauf! · MK-Electro · Von-Drais-Straße 3a · 68775 Ketsch<br>Kein Ausweis der Steuer, da Kleinunternehmerregelung nach §19 UStG</div>
    </div>
  `;
}

// ── Invoice Modal ─────────────────────────────────────────────────────────────
function InvoiceModal({ order, onClose }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const invoiceNr = "RE-" + order.id.replace("MKE-","") + "-1";
  const html = generateInvoiceHTML(order, invoiceNr);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head><title>Rechnung ${invoiceNr}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=Barlow:wght@300;400;500;600&display=swap');
        body{font-family:'Barlow',sans-serif;background:#fff;margin:0;padding:2rem}
        .inv-preview{max-width:800px;margin:0 auto}
        .inv-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:2px solid #e8a020}
        .inv-company h2{font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;color:#e8a020;margin-bottom:.2rem}
        .inv-company p,.inv-meta{font-size:.75rem;color:#555}
        .inv-meta{text-align:right} .inv-meta strong{display:block;font-size:1rem;color:#111;font-family:'Barlow Condensed',sans-serif;font-weight:900}
        .inv-addrs{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.4rem}
        .inv-addr h4{font-size:.7rem;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:.3rem}
        .inv-addr p{font-size:.82rem;color:#222}
        .inv-tbl{width:100%;border-collapse:collapse;margin-bottom:1.2rem}
        .inv-tbl th{background:#f5f5f5;padding:.5rem .7rem;text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:2px solid #e8a020}
        .inv-tbl td{padding:.45rem .7rem;border-bottom:1px solid #eee;font-size:.8rem}
        .inv-tbl tfoot td{border-top:2px solid #e8a020;font-weight:700;font-size:.88rem}
        .inv-footer{margin-top:1.2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.72rem;color:#888;text-align:center}
        .inv-bank{background:#fffbf2;border:1px solid #e8a020;border-radius:6px;padding:.7rem;margin:.8rem 0;font-size:.75rem}
        .inv-bank strong{color:#e8a020}
      </style>
    </head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  const handleSendMail = async () => {
    setSending(true);
    // Simulate API call (in production: connect to email API)
    await new Promise(r => setTimeout(r, 1800));
    setSending(false);
    setSent(true);
  };

  return (
    <div className="mkov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mkbox" style={{maxWidth:"min(750px,100%)"}}>
        <h2><I d={ICONS.invoice} size={20}/> Rechnung · {invoiceNr}</h2>

        {/* Preview */}
        <div style={{maxHeight:"420px",overflowY:"auto",border:"1px solid var(--br)",borderRadius:"8px",marginBottom:"1rem"}}>
          <div dangerouslySetInnerHTML={{__html: html}} />
        </div>

        {/* Customer email info */}
        <div style={{background:"var(--sf2)",border:"1px solid var(--br)",borderRadius:"8px",padding:".75rem 1rem",fontSize:".83rem",marginBottom:".8rem",display:"flex",gap:".6rem",alignItems:"center"}}>
          <I d={ICONS.mail} size={16} />
          <span>Empfänger: <strong>{order.customer?.name}</strong> &lt;{order.customer?.email}&gt;</span>
        </div>

        {sent && (
          <div className="mail-sent">
            <I d={ICONS.check} size={18}/> Rechnung wurde erfolgreich an <strong>{order.customer?.email}</strong> versendet. (Demo-Modus)
          </div>
        )}

        <div className="mk-acts" style={{flexWrap:"wrap"}}>
          <button className="btn btn-o" onClick={onClose}>Schließen</button>
          <button className="btn btn-o" onClick={handlePrint}>
            <I d={ICONS.print} size={15}/> Drucken / PDF
          </button>
          <button className="btn btn-i" onClick={handleSendMail} disabled={sending || sent} style={{opacity:sent?.6:1}}>
            <I d={sent ? ICONS.check : ICONS.mail} size={15}/>
            {sending ? "Sende…" : sent ? "Gesendet" : "Per E-Mail senden"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order Detail Modal ────────────────────────────────────────────────────────
function OrderModal({ order, onClose, onStatusChange, onSaveDetails, onOpenInvoice }) {
  const [status, setStatus] = useState(order.status);
  const [carrier, setCarrier] = useState(order.carrier || "");
  const [trackingNr, setTrackingNr] = useState(order.tracking_number || "");
  const [serialNums, setSerialNums] = useState(
    order.serial_numbers || (order.items||[]).map(i=>({id:i.id, name:i.name, serial:""}))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const CARRIERS = ["Hermes","DHL","DHL Express","UPS","GLS","Sonstiges"];
  const statusClass = { "Neu":"s-new","Bezahlt":"s-paid","Versendet":"s-ship","Storniert":"s-canc" };

  const setSerial = (id, val) => setSerialNums(s => s.map(x => x.id===id ? {...x,serial:val} : x));

  const save = async () => {
    setSaving(true);
    const fields = {
      status,
      carrier: carrier || null,
      tracking_number: trackingNr || null,
      serial_numbers: serialNums,
    };
    await onSaveDetails(order.id, fields);
    setSaving(false); setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const copyTracking = () => {
    navigator.clipboard.writeText(trackingNr);
  };

  // Build tracking URL
  const trackingUrl = () => {
    if (!trackingNr) return null;
    if (carrier === "DHL" || carrier === "DHL Express")
      return `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?idc=${trackingNr}`;
    if (carrier === "Hermes")
      return `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${trackingNr}`;
    if (carrier === "UPS")
      return `https://www.ups.com/track?tracknum=${trackingNr}`;
    if (carrier === "GLS")
      return `https://gls-group.com/track/${trackingNr}`;
    return null;
  };

  return (
    <div className="mkov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mkbox" style={{maxWidth:"min(740px,100%)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.3rem"}}>
          <h2 style={{margin:0}}>Bestellung {order.id}</h2>
          <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
            <span className={`spill ${statusClass[order.status]||"s-new"}`}>{order.status}</span>
            <button className="xbtn" onClick={onClose}><I d={ICONS.x} size={14}/></button>
          </div>
        </div>

        {/* Kundendaten */}
        <div className="od-sec">
          <h3>Kundendaten</h3>
          <div className="od-grid">
            {[
              ["Name", order.customer?.name],
              ["E-Mail", order.customer?.email],
              ["Adresse", `${order.customer?.street||""}, ${order.customer?.zip||""} ${order.customer?.city||""}`],
              ["Zahlung", order.payment==="paypal"?"PayPal":"Vorkasse"],
              ["Datum", order.date],
            ].map(([l,v])=>(
              <div key={l} className="od-f"><label>{l}</label><p>{v||"—"}</p></div>
            ))}
          </div>
        </div>

        {/* Bestellte Artikel + Seriennummern */}
        <div className="od-sec">
          <h3>Bestellte Artikel & Seriennummern</h3>
          <div className="od-items">
            {(order.items||[]).map(i => {
              const sn = serialNums.find(x=>x.id===i.id);
              return (
                <div key={i.id} className="od-item" style={{flexDirection:"column",alignItems:"stretch"}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontWeight:500}}>{i.name} <span style={{color:"var(--mu)"}}>×{i.qty}</span></span>
                    <span style={{color:"var(--acc)",fontWeight:700,flexShrink:0,marginLeft:".5rem"}}>{fmt(i.price*i.qty)}</span>
                  </div>
                  <div style={{marginTop:".35rem"}}>
                    <input
                      className="fi"
                      style={{fontSize:".78rem",padding:".3rem .6rem",fontFamily:"monospace"}}
                      placeholder={`Seriennummer (optional) — z.B. SN-${i.id?.toString().slice(-4)||"0000"}`}
                      value={sn?.serial||""}
                      onChange={e=>setSerial(i.id, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
            <div className="od-total"><span>Gesamtbetrag</span><span>{fmt(order.total)}</span></div>
          </div>
        </div>

        {/* Versand */}
        <div className="od-sec">
          <h3><I d={ICONS.truck} size={14}/> Versandinformationen</h3>
          <div className="fr" style={{gap:".75rem",flexWrap:"wrap"}}>
            <div className="fg" style={{minWidth:"180px"}}>
              <label style={{fontSize:".72rem",color:"var(--mu)",textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:".4rem"}}>Versanddienstleister</label>
              <select className="fi" value={carrier} onChange={e=>setCarrier(e.target.value)}>
                <option value="">— Kein Versand —</option>
                {CARRIERS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              {carrier === "Sonstiges" && (
                <input className="fi" style={{marginTop:".4rem"}} placeholder="Dienstleister eingeben…"
                  value={carrier==="Sonstiges"?"":carrier}
                  onChange={e=>setCarrier(e.target.value)}/>
              )}
            </div>
            <div className="fg" style={{flex:2,minWidth:"220px"}}>
              <label style={{fontSize:".72rem",color:"var(--mu)",textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:".4rem"}}>Trackingnummer</label>
              <div style={{display:"flex",gap:".4rem"}}>
                <input className="fi" style={{fontFamily:"monospace"}}
                  placeholder="z.B. 1Z999AA10123456784"
                  value={trackingNr}
                  onChange={e=>setTrackingNr(e.target.value)}/>
                {trackingNr && (
                  <button className="btn btn-o btn-sm" onClick={copyTracking} title="Kopieren">
                    <I d={ICONS.link} size={13}/>
                  </button>
                )}
              </div>
              {/* Tracking Link */}
              {trackingNr && trackingUrl() && (
                <a href={trackingUrl()} target="_blank" rel="noreferrer"
                  style={{fontSize:".73rem",color:"var(--inf)",marginTop:".35rem",display:"flex",alignItems:"center",gap:".25rem",textDecoration:"none"}}>
                  <I d={ICONS.link} size={11}/> Sendung verfolgen ({carrier})
                </a>
              )}
              {trackingNr && !trackingUrl() && (
                <div style={{fontSize:".73rem",color:"var(--mu)",marginTop:".35rem"}}>
                  Trackingnummer gespeichert
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="od-sec">
          <h3>Bestellstatus</h3>
          <select className="fi" value={status} onChange={e=>setStatus(e.target.value)}>
            {["Neu","Bezahlt","Versendet","Storniert"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          {status==="Versendet" && !carrier && (
            <div style={{fontSize:".75rem",color:"var(--acc)",marginTop:".4rem",display:"flex",alignItems:"center",gap:".3rem"}}>
              <I d={ICONS.truck} size={12}/> Tipp: Versanddienstleister & Trackingnummer oben eintragen
            </div>
          )}
        </div>

        <div className="mk-acts" style={{flexWrap:"wrap"}}>
          <button className="btn btn-o" onClick={onClose}>Schließen</button>
          <button className="btn btn-i" onClick={onOpenInvoice}>
            <I d={ICONS.invoice} size={15}/> Rechnung
          </button>
          <button className="btn btn-ok" onClick={save} disabled={saving}>
            {saved
              ? <><I d={ICONS.check} size={15}/> Gespeichert!</>
              : saving ? "Speichert…"
              : <><I d={ICONS.check} size={15}/> Speichern</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Form Modal ────────────────────────────────────────────────────────
function ProductModal({ product, onSave, onClose }) {
  const def = { name:"", category:"", price:"", ek:"", shipping:"", stock:"", stockExternal:"", delivery:"", sku:"", images:[], description:"", supplier:"", id:null };
  const init = {...def, ...product, images: product.images || (product.image ? [product.image] : []) };
  const [form, setForm] = useState(init);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const SUPPLIERS = ["Mediaelectronics Spain","dbreactor","Amazon","Sonstige"];

  const submit = () => {
    if (!form.name || !form.price) return alert("Name und VK-Preis sind Pflichtfelder.");
    onSave({ ...form, price:parseFloat(form.price)||0, ek:parseFloat(form.ek)||0, shipping:parseFloat(form.shipping)||0, stock:parseInt(form.stock)||0, stockExternal:parseInt(form.stockExternal)||0 });
  };

  return (
    <div className="mkov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mkbox">
        <h2>{form.id?"Produkt bearbeiten":"Neues Produkt"}</h2>
        <div className="fg"><label>Produktname *</label><input className="fi" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="z.B. Pioneer MVH-S420BT" /></div>
        <div className="fr">
          <div className="fg"><label>Kategorie</label><input className="fi" value={form.category} onChange={e=>set("category",e.target.value)} placeholder="z.B. Autoradio" /></div>
          <div className="fg"><label>SKU / Modellnr.</label><input className="fi" value={form.sku} onChange={e=>set("sku",e.target.value)} placeholder="z.B. MVH-S420BT" /></div>
        </div>
        {/* Lieferant */}
        <div className="fr" style={{alignItems:"flex-end"}}>
          <div className="fg">
            <label>Lieferant</label>
            <select className="fi" value={form.supplier} onChange={e=>set("supplier",e.target.value)}>
              <option value="">— Kein Lieferant —</option>
              {SUPPLIERS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {form.supplier && (
            <div style={{paddingBottom:".5rem",fontSize:".8rem",color:"var(--mu)",display:"flex",alignItems:"center",gap:".35rem",whiteSpace:"nowrap"}}>
              <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"var(--ok)",display:"inline-block"}}/>
              {form.supplier}
            </div>
          )}
        </div>
        <div className="fr">
          <div className="fg"><label>Einkaufspreis EK (€)</label><input className="fi" type="number" step="0.01" value={form.ek} onChange={e=>set("ek",e.target.value)} placeholder="0.00" /></div>
          <div className="fg"><label>Versandkosten (€)</label><input className="fi" type="number" step="0.01" value={form.shipping||""} onChange={e=>set("shipping",e.target.value)} placeholder="z.B. 5.49" /><div style={{fontSize:".68rem",color:"var(--mu)",marginTop:".2rem"}}>Hermes S 5,49 · M 6,99 · L 8,99</div></div>
          <div className="fg"><label>VK inkl. Versand (€) *</label><input className="fi" type="number" step="0.01" value={form.price} onChange={e=>set("price",e.target.value)} placeholder="0.00" /><div style={{fontSize:".68rem",color:"var(--mu)",marginTop:".2rem"}}>= Preis den Käufer zahlt</div></div>
        </div>
        {/* Margin live display */}
        {(() => {
          const m = calcMargin(form.price, form.ek, form.shipping);
          if (!m) return null;
          const color = m.pct >= 25 ? "var(--ok)" : m.pct >= 15 ? "var(--acc)" : "var(--err)";
          const label = m.pct >= 25 ? "🟢 Gut" : m.pct >= 15 ? "🟡 OK" : "🔴 Zu gering";
          return (
            <div style={{background:"var(--sf2)",border:"1px solid var(--br)",borderRadius:"8px",padding:".65rem 1rem",marginBottom:".7rem",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:".5rem",fontSize:".78rem"}}>
              <div><div style={{color:"var(--mu)",fontSize:".68rem",marginBottom:".15rem"}}>Netto-Gewinn/Stk.</div><div style={{fontWeight:700,color,fontSize:"1rem"}}>{fmt(m.netto)}</div></div>
              <div><div style={{color:"var(--mu)",fontSize:".68rem",marginBottom:".15rem"}}>Marge (nach Gebühren)</div><div style={{fontWeight:700,color}}>{m.pct}% {label}</div></div>
              <div><div style={{color:"var(--mu)",fontSize:".68rem",marginBottom:".15rem"}}>eBay-Gebühr</div><div style={{fontWeight:600,color:"var(--mu)"}}>{fmt(m.ebay)}</div></div>
              <div><div style={{color:"var(--mu)",fontSize:".68rem",marginBottom:".15rem"}}>Versandkosten</div><div style={{fontWeight:600,color:"var(--mu)"}}>{fmt(form.shipping||0)}</div></div>
            </div>
          );
        })()}
        {/* Stock section */}
        <div className="fg" style={{marginBottom:".4rem"}}>
          <label>Lagerbestand</label>
          <div className="stock-form-grid">
            <div>
              <div style={{fontSize:".72rem",color:"var(--ok)",fontWeight:700,marginBottom:".28rem",display:"flex",alignItems:"center",gap:".3rem"}}>
                <span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>
                Eigenes Lager
              </div>
              <input className="fi" type="number" min="0" value={form.stock}
                onChange={e=>set("stock",e.target.value)} placeholder="0" />
            </div>
            <div>
              <div style={{fontSize:".72rem",color:"#f97316",fontWeight:700,marginBottom:".28rem",display:"flex",alignItems:"center",gap:".3rem"}}>
                <span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#f97316",display:"inline-block"}}/>
                Außenlager (Händler)
              </div>
              <input className="fi" type="number" min="0" value={form.stockExternal||""}
                onChange={e=>set("stockExternal",e.target.value)} placeholder="0" />
            </div>
            <div>
              <div style={{fontSize:".72rem",color:"var(--mu)",fontWeight:700,marginBottom:".28rem"}}>
                Gesamt
              </div>
              <div className="fi" style={{background:"var(--sf3)",display:"flex",alignItems:"center",fontWeight:700,color:"var(--tx)"}}>
                {(parseInt(form.stock)||0) + (parseInt(form.stockExternal)||0)} Stk.
              </div>
            </div>
          </div>
          {/* Live preview */}
          {((parseInt(form.stock)||0) + (parseInt(form.stockExternal)||0)) > 0 && (
            <div className="stock-preview">
              <div className="stock-preview-ttl">Vorschau im Shop</div>
              {(parseInt(form.stock)||0) > 0 && (
                <div className="stock-line">
                  <span className="stock-dot sd-green"/>
                  <span style={{color:"var(--ok)",fontSize:".78rem"}}>
                    {(parseInt(form.stock)||0) > 8 ? "Sofort verfügbar" : `Noch ${parseInt(form.stock)} Stk. auf Lager`}
                  </span>
                  <span style={{color:"var(--mu)",marginLeft:"auto",fontSize:".72rem"}}>
                    {form.delivery||"1-3 Werktage"}
                  </span>
                </div>
              )}
              {(parseInt(form.stockExternal)||0) > 0 && (
                <div className="stock-line">
                  <span className="stock-dot sd-orange"/>
                  <span style={{color:"#f97316",fontSize:".78rem"}}>
                    {parseInt(form.stockExternal)} Stk. im <span className="ext-tag">Außenlager</span>
                  </span>
                  <span style={{color:"var(--mu)",marginLeft:"auto",fontSize:".72rem"}}>
                    {(form.delivery||"1-3 Werktage").replace(/(\d+)-(\d+)/, (_,a,b)=>`${+a+2}-${+b+2}`).replace(/^(\d+)(?!\d)/,(_,a)=>`${+a+2}`)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="fg"><label>Lieferzeit (eigenes Lager)</label><input className="fi" value={form.delivery} onChange={e=>set("delivery",e.target.value)} placeholder="1-3 Werktage" /><div style={{fontSize:".7rem",color:"var(--mu)",marginTop:".3rem"}}>Außenlager erhält automatisch +2 Tage</div></div>
        <div className="fg">
          <label>Produktbilder (Einzel- & Mehrfachauswahl)</label>
          <ImageUpload images={form.images} onChange={imgs=>set("images",imgs)} />
        </div>
        <div className="fg"><label>Beschreibung</label><textarea className="fi" rows={3} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Kurze Produktbeschreibung…" style={{resize:"vertical"}} /></div>
        <div className="mk-acts">
          <button className="btn btn-o" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-p" onClick={submit}>Speichern</button>
        </div>
      </div>
    </div>
  );
}

// ── Copy Button ───────────────────────────────────────────────────────────────
function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = value; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className={`copy-btn${copied?" copied":""}`} onClick={copy}>
      {copied
        ? <><I d={ICONS.check} size={11}/> Kopiert!</>
        : <><I d={ICONS.link} size={11}/> Kopieren</>
      }
    </button>
  );
}

// ── Bank Info Block (reusable) ────────────────────────────────────────────────
function BankInfo({ orderId, total }) {
  const iban = "DE59 5467 0024 0032 0051 00";
  const bic  = "DEUTDEDB546";
  return (
    <div className="bank-box">
      <div style={{fontWeight:700,fontSize:".9rem",color:"var(--tx)",marginBottom:".65rem",display:"flex",alignItems:"center",gap:".4rem"}}>
        <I d={ICONS.shield} size={15}/> Bankverbindung für Überweisung
      </div>

      <div className="bank-row">
        <div>
          <div className="bank-row-label">Kontoinhaber</div>
          <div className="bank-row-value" style={{letterSpacing:"normal"}}>MK-Electro · Inh. Andreas Kraus</div>
        </div>
      </div>

      <div className="bank-row">
        <div>
          <div className="bank-row-label">IBAN</div>
          <div className="bank-row-value">{iban}</div>
        </div>
        <CopyBtn value={iban.replace(/\s/g,"")} />
      </div>

      <div className="bank-row">
        <div>
          <div className="bank-row-label">BIC / SWIFT</div>
          <div className="bank-row-value">{bic}</div>
        </div>
        <CopyBtn value={bic} />
      </div>

      <div className="bank-row">
        <div>
          <div className="bank-row-label">Bank</div>
          <div className="bank-row-value" style={{letterSpacing:"normal"}}>Deutsche Bank Mannheim</div>
        </div>
      </div>

      {orderId && (
        <div className="bank-row" style={{borderTop:"1px solid var(--br)",marginTop:".5rem",paddingTop:".5rem"}}>
          <div>
            <div className="bank-row-label">Verwendungszweck (Bestellnummer)</div>
            <div className="bank-row-value" style={{color:"var(--acc)"}}>{orderId}</div>
          </div>
          <CopyBtn value={orderId} />
        </div>
      )}

      {total && (
        <div style={{marginTop:".65rem",padding:".5rem .7rem",background:"rgba(232,160,32,.08)",border:"1px solid rgba(232,160,32,.2)",borderRadius:"7px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:".78rem",color:"var(--mu)"}}>Zu überweisender Betrag</span>
          <span style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:"1.25rem",color:"var(--acc)"}}>{fmt(total)}</span>
        </div>
      )}

      <div style={{fontSize:".72rem",color:"var(--mu)",marginTop:".65rem",lineHeight:1.6}}>
        ⚠️ Bitte geben Sie die Bestellnummer als Verwendungszweck an. Die Bestellung wird nach Zahlungseingang bearbeitet.
      </div>
    </div>
  );
}

// ── PayPal SDK Loader ─────────────────────────────────────────────────────────
const PAYPAL_CLIENT_ID = "AURk4HvrNkLuuls5w90A6-Ee9nYD55SnBnNyG3J8MiLFP9YT9s7FWtmkbacLCm_v5dLBojL3u6NWd0jt";
let paypalLoaded = false;
function loadPayPalSDK() {
  return new Promise((resolve, reject) => {
    if (paypalLoaded || window.paypal) { paypalLoaded = true; resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&locale=de_DE`;
    script.onload = () => { paypalLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ── PayPal Button Component ───────────────────────────────────────────────────
function PayPalButton({ amount, onSuccess, onError, disabled }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (disabled) return;
    let buttons = null;
    (async () => {
      try {
        await loadPayPalSDK();
        if (!containerRef.current) return;
        containerRef.current.innerHTML = "";
        buttons = window.paypal.Buttons({
          style: {
            layout: "vertical", color: "gold", shape: "rect",
            label: "pay", height: 48,
          },
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                amount: { value: amount.toFixed(2), currency_code: "EUR" },
                description: "MK-Electro Bestellung",
              }],
              application_context: {
                brand_name: "MK-Electro",
                locale: "de-DE",
                user_action: "PAY_NOW",
              },
            });
          },
          onApprove: async (data, actions) => {
            const details = await actions.order.capture();
            onSuccess(details);
          },
          onError: (err) => {
            console.error("PayPal Fehler:", err);
            setErr("PayPal Fehler. Bitte versuche es erneut.");
            if (onError) onError(err);
          },
          onCancel: () => {
            setErr("Zahlung abgebrochen. Du kannst es erneut versuchen.");
          },
        });
        await buttons.render(containerRef.current);
        setLoading(false);
      } catch(e) {
        setErr("PayPal konnte nicht geladen werden. Bitte Seite neu laden.");
        setLoading(false);
      }
    })();
    return () => { if (buttons) buttons.close?.(); };
  }, [amount, disabled]);

  if (disabled) return null;
  return (
    <div>
      {loading && (
        <div className="pay-processing">
          <I d={ICONS.shield} size={16}/> PayPal wird geladen…
        </div>
      )}
      <div ref={containerRef} className="paypal-btn-wrap" style={{display:loading?"none":"block"}}/>
      {err && <div className="pay-error"><I d={ICONS.x} size={13}/> {err}</div>}
    </div>
  );
}

// ── CHECKOUT ──────────────────────────────────────────────────────────────────
function Checkout({ cart, cartTotal, cartSubtotal, shippingCost, onClose, onOrder, custUser }) {
  const meta = custUser?.user_metadata || {};

  // Pre-fill from logged-in user
  const [payment, setPayment] = useState("paypal");
  const [billing, setBilling] = useState({
    name:   meta.full_name  || "",
    email:  custUser?.email || "",
    phone:  meta.phone      || "",
    street: meta.street     || "",
    zip:    meta.zip        || "",
    city:   meta.city       || "",
  });
  const [sameAsDelivery, setSameAsDelivery] = useState(true);
  const [delivery, setDelivery] = useState({ name:"", street:"", zip:"", city:"" });
  const [err, setErr] = useState({});
  const [step, setStep] = useState("form");
  const [consentDaten, setConsentDaten] = useState(false);
  const [consentNewsletter, setConsentNewsletter] = useState(false);
  const [consentErr, setConsentErr] = useState(false);
  const [paypalError, setPaypalError] = useState(null);

  const sb = (k,v) => setBilling(x=>({...x,[k]:v}));
  const sd = (k,v) => setDelivery(x=>({...x,[k]:v}));

  const validate = () => {
    const e={};
    if(!billing.name.trim())e.name=1;
    if(!billing.email.includes("@"))e.email=1;
    if(!billing.street.trim())e.street=1;
    if(!billing.zip.trim())e.zip=1;
    if(!billing.city.trim())e.city=1;
    if(!sameAsDelivery){
      if(!delivery.name.trim())e.dname=1;
      if(!delivery.street.trim())e.dstreet=1;
      if(!delivery.zip.trim())e.dzip=1;
      if(!delivery.city.trim())e.dcity=1;
    }
    setErr(e); return !Object.keys(e).length;
  };

  // The address used for shipping
  const shippingAddr = sameAsDelivery ? billing : {...delivery, email:billing.email, phone:billing.phone};

  const handleToConfirm = () => { if (validate()) { setStep("confirm"); setConsentErr(false); } };
  const handleConfirm = () => {
    if (!consentDaten) { setConsentErr(true); return; }
    if (payment === "vorkasse") {
      onOrder({ payment:"vorkasse", customer: shippingAddr, billing, newsletter:consentNewsletter });
    } else { setStep("payment"); }
  };
  const handlePayPalSuccess = (details) => {
    setStep("processing");
    onOrder({ payment:"paypal", customer: shippingAddr, billing, paypalOrderId:details.id, newsletter:consentNewsletter });
  };

  const steps = [{key:"form",label:"Daten"},{key:"confirm",label:"Prüfen"},{key:"payment",label:"Zahlung"}];
  const stepIdx = steps.findIndex(s=>s.key===step);

  return (
    <>
      <div className="ov" onClick={onClose}/>
      <div className="chk-ov">
        <div className="chk-box">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.2rem"}}>
            <h2 style={{margin:0}}>Kasse</h2>
            <div className="xbtn" onClick={onClose}><I d={ICONS.x} size={14}/></div>
          </div>

          {/* Step indicator */}
          {step !== "processing" && (
            <div className="chk-steps">
              {steps.map((s,i) => (
                <React.Fragment key={s.key}>
                  <div className={`chk-step${i<stepIdx?" done":i===stepIdx?" active":""}`}>
                    <div className="chk-step-num">{i<stepIdx?<I d={ICONS.check} size={11}/>:i+1}</div>
                    {s.label}
                  </div>
                  {i<steps.length-1 && <div className="chk-step-line"/>}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── STEP 1: FORM ── */}
          {step === "form" && (
            <>
              {/* Autofill hint */}
              {custUser && (meta.street || meta.city) && (
                <div className="autofill-bar">
                  <I d={ICONS.user} size={14}/>
                  Daten aus Ihrem Kundenkonto vorausgefüllt
                </div>
              )}

              {/* RECHNUNGSADRESSE */}
              <div className="sec-ttl">Rechnungsadresse</div>
              <div className="fg"><label>Vor- & Nachname *</label>
                <input className={`fi${err.name?" err":""}`} placeholder="Max Mustermann" value={billing.name} onChange={e=>sb("name",e.target.value)}/>
              </div>
              <div className="fr">
                <div className="fg"><label>E-Mail *</label>
                  <input className={`fi${err.email?" err":""}`} type="email" placeholder="max@beispiel.de" value={billing.email} onChange={e=>sb("email",e.target.value)}/>
                </div>
                <div className="fg"><label>Telefon (optional)</label>
                  <input className="fi" type="tel" placeholder="+49 …" value={billing.phone} onChange={e=>sb("phone",e.target.value)}/>
                </div>
              </div>
              <div className="fg"><label>Straße & Hausnummer *</label>
                <input className={`fi${err.street?" err":""}`} placeholder="Musterstraße 12" value={billing.street} onChange={e=>sb("street",e.target.value)}/>
              </div>
              <div className="fr">
                <div className="fg"><label>PLZ *</label>
                  <input className={`fi${err.zip?" err":""}`} placeholder="12345" value={billing.zip} onChange={e=>sb("zip",e.target.value)}/>
                </div>
                <div className="fg"><label>Ort *</label>
                  <input className={`fi${err.city?" err":""}`} placeholder="Ketsch" value={billing.city} onChange={e=>sb("city",e.target.value)}/>
                </div>
              </div>

              {/* LIEFERADRESSE TOGGLE */}
              <div className="delivery-toggle" onClick={()=>setSameAsDelivery(v=>!v)}>
                <div className={`delivery-toggle-box${sameAsDelivery?" on":""}`}>
                  {sameAsDelivery && <I d={ICONS.check} size={12} sw={3}/>}
                </div>
                <div>
                  <div className="delivery-toggle-txt">Lieferadresse = Rechnungsadresse</div>
                  <div className="delivery-toggle-sub">{sameAsDelivery ? "Lieferung an obige Adresse" : "Abweichende Lieferadresse angeben"}</div>
                </div>
              </div>

              {/* ABWEICHENDE LIEFERADRESSE */}
              {!sameAsDelivery && (
                <div style={{background:"var(--sf2)",border:"1px solid var(--br)",borderRadius:"10px",padding:"1rem",marginBottom:".85rem"}}>
                  <div style={{fontSize:".72rem",fontWeight:700,color:"var(--acc)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:".75rem",display:"flex",alignItems:"center",gap:".4rem"}}>
                    <I d={ICONS.truck} size={13}/> Abweichende Lieferadresse
                  </div>
                  <div className="fg"><label>Name des Empfängers *</label>
                    <input className={`fi${err.dname?" err":""}`} placeholder="Empfänger Name" value={delivery.name} onChange={e=>sd("name",e.target.value)}/>
                  </div>
                  <div className="fg"><label>Straße & Hausnummer *</label>
                    <input className={`fi${err.dstreet?" err":""}`} placeholder="Lieferstraße 12" value={delivery.street} onChange={e=>sd("street",e.target.value)}/>
                  </div>
                  <div className="fr">
                    <div className="fg"><label>PLZ *</label>
                      <input className={`fi${err.dzip?" err":""}`} placeholder="12345" value={delivery.zip} onChange={e=>sd("zip",e.target.value)}/>
                    </div>
                    <div className="fg"><label>Ort *</label>
                      <input className={`fi${err.dcity?" err":""}`} placeholder="Berlin" value={delivery.city} onChange={e=>sd("city",e.target.value)}/>
                    </div>
                  </div>
                </div>
              )}

              {/* ZAHLUNGSART */}
              <div className="sec-ttl">Zahlungsart</div>
              <div className="pay-opts">
                <div className={`popt${payment==="paypal"?" on":""}`} onClick={()=>setPayment("paypal")}>
                  <div className="pp-logo">Pay<span>Pal</span></div>
                  <div className="popt-lbl">PayPal</div>
                  <div className="popt-sub">Schnell & sicher</div>
                </div>
                <div className={`popt${payment==="vorkasse"?" on":""}`} onClick={()=>setPayment("vorkasse")}>
                  <div style={{fontSize:"1.1rem"}}>🏦</div>
                  <div className="popt-lbl">Vorkasse</div>
                  <div className="popt-sub">Banküberweisung</div>
                </div>
              </div>

              <div className="chk-acts">
                <button className="btn btn-o" onClick={onClose}>Abbrechen</button>
                <button className="btn btn-p" onClick={handleToConfirm}>Weiter zur Übersicht →</button>
              </div>
            </>
          )}

          {/* ── STEP 2: CONFIRM ── */}
          {step === "confirm" && (
            <>
              {/* Rechnungsadresse */}
              <div className="conf-block">
                <h4><I d={ICONS.user} size={14}/> Rechnungsadresse</h4>
                <div className="conf-row"><span>Name</span><span>{billing.name}</span></div>
                <div className="conf-row"><span>E-Mail</span><span>{billing.email}</span></div>
                {billing.phone && <div className="conf-row"><span>Telefon</span><span>{billing.phone}</span></div>}
                <div className="conf-row"><span>Adresse</span><span>{billing.street}, {billing.zip} {billing.city}</span></div>
              </div>

              {/* Lieferadresse */}
              {!sameAsDelivery && (
                <div className="conf-block">
                  <h4><I d={ICONS.truck} size={14}/> Lieferadresse</h4>
                  <div className="conf-row"><span>Empfänger</span><span>{delivery.name}</span></div>
                  <div className="conf-row"><span>Adresse</span><span>{delivery.street}, {delivery.zip} {delivery.city}</span></div>
                </div>
              )}
              {sameAsDelivery && (
                <div style={{fontSize:".78rem",color:"var(--mu)",marginBottom:".75rem",display:"flex",alignItems:"center",gap:".4rem"}}>
                  <I d={ICONS.check} size={13} style={{color:"var(--ok)"}}/> Lieferadresse = Rechnungsadresse
                </div>
              )}

              {/* Zahlung */}
              <div className="conf-block">
                <h4><I d={ICONS.shield} size={14}/> Zahlungsart</h4>
                <div className="conf-row">
                  <span>Methode</span>
                  <span style={{fontWeight:700,color:payment==="paypal"?"#009cde":"var(--acc)"}}>
                    {payment==="paypal"?"💳 PayPal":"🏦 Vorkasse"}
                  </span>
                </div>
                {payment==="vorkasse" && <div style={{marginTop:".75rem"}}><BankInfo/></div>}
              </div>

              {/* Bestellübersicht */}
              <div className="conf-block">
                <h4><I d={ICONS.box} size={14}/> Bestellübersicht</h4>
                {cart.map(i=>(
                  <div key={i.id} className="conf-row">
                    <span>{i.name.split(" ").slice(0,4).join(" ")} × {i.qty}</span>
                    <span>{fmt(i.price*i.qty)}</span>
                  </div>
                ))}
                <div className="conf-row" style={{marginTop:".4rem",paddingTop:".4rem",borderTop:"1px solid var(--br)"}}>
                  <span>Zwischensumme</span>
                  <span>{fmt(cartSubtotal)}</span>
                </div>
                <div className="conf-row">
                  <span style={{display:"flex",alignItems:"center",gap:".3rem"}}>
                    <I d={ICONS.truck} size={12}/> Versandkosten
                  </span>
                  <span style={{color: shippingCost===0 ? "var(--ok)" : "var(--tx)", fontWeight:600}}>
                    {shippingCost===0 ? "Kostenlos ✓" : fmt(shippingCost)}
                  </span>
                </div>
                <div className="conf-total"><span>Gesamtbetrag</span><span>{fmt(cartTotal)}</span></div>
                <div style={{fontSize:".72rem",color:"var(--mu)",marginTop:".35rem"}}>
                  inkl. 19% MwSt. {shippingCost===0 ? "· Versand kostenlos ab 50 €" : "· Versandpauschale 6,00 €"}
                </div>
              </div>

              {/* Einverständnisse */}
              <div className="chk-consent">
                <div className={`chk-consent-row required${consentDaten?" checked":""}${consentErr&&!consentDaten?" err-border":""}`}
                  onClick={()=>{setConsentDaten(v=>!v);setConsentErr(false);}}>
                  <div className={`chk-box-input${consentDaten?" checked":""}`}>
                    {consentDaten && <I d={ICONS.check} size={11} sw={3}/>}
                  </div>
                  <div className="chk-consent-txt">
                    <strong>Einverständnis Datenverarbeitung *</strong><br/>
                    Ich stimme zu, dass meine Daten zur Bestellabwicklung gemäß der Datenschutzerklärung verarbeitet werden.
                  </div>
                </div>
                {consentErr && !consentDaten && (
                  <div style={{fontSize:".75rem",color:"var(--err)",marginBottom:".5rem",paddingLeft:".75rem",display:"flex",alignItems:"center",gap:".3rem"}}>
                    <I d={ICONS.x} size={12}/> Bitte zustimmen um fortzufahren.
                  </div>
                )}
                <div className={`chk-consent-row${consentNewsletter?" checked":""}`}
                  onClick={()=>setConsentNewsletter(v=>!v)}>
                  <div className={`chk-box-input${consentNewsletter?" checked-opt":""}`}>
                    {consentNewsletter && <I d={ICONS.check} size={11} sw={3}/>}
                  </div>
                  <div className="chk-consent-txt">
                    <strong>Newsletter</strong> <span style={{fontWeight:400,color:"var(--mu)"}}>(optional)</span><br/>
                    Ja, ich möchte den MK-Electro Newsletter erhalten.
                  </div>
                </div>
              </div>
              <div style={{fontSize:".72rem",color:"var(--mu)",marginBottom:".5rem"}}>* Pflichtfeld</div>

              <div className="chk-acts">
                <button className="btn btn-o" onClick={()=>setStep("form")}>← Zurück</button>
                <button className="btn btn-p" onClick={handleConfirm} style={{flex:1,justifyContent:"center"}}>
                  {payment==="paypal"
                    ? <><I d={ICONS.shield} size={15}/> Weiter zu PayPal →</>
                    : <><I d={ICONS.check} size={15}/> Jetzt kostenpflichtig bestellen</>
                  }
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: PAYPAL ── */}
          {step === "payment" && (
            <>
              <div style={{textAlign:"center",marginBottom:"1rem"}}>
                <div style={{fontSize:"1rem",fontWeight:700,marginBottom:".3rem"}}>PayPal Zahlung</div>
                <div style={{fontSize:".83rem",color:"var(--mu)"}}>
                  Betrag: <strong style={{color:"var(--acc)",fontSize:"1.1rem"}}>{fmt(cartTotal)}</strong>
                </div>
              </div>
              <PayPalButton amount={cartTotal} onSuccess={handlePayPalSuccess}
                onError={()=>setPaypalError("PayPal Zahlung fehlgeschlagen.")} disabled={false}/>
              {paypalError && <div className="pay-error"><I d={ICONS.x} size={13}/> {paypalError}</div>}
              <button className="btn btn-o btn-sm" style={{marginTop:".85rem",width:"100%",justifyContent:"center"}}
                onClick={()=>setStep("confirm")}>← Zurück zur Übersicht</button>
            </>
          )}

          {/* ── PROCESSING ── */}
          {step === "processing" && (
            <div className="pay-processing" style={{flexDirection:"column",gap:"1rem",padding:"2.5rem"}}>
              <I d={ICONS.check} size={36}/>
              <div style={{fontWeight:700,fontSize:"1.1rem"}}>Zahlung erfolgreich!</div>
              <div style={{fontSize:".82rem",color:"var(--mu)"}}>Bestellung wird verarbeitet…</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── CONTACT PAGE ──────────────────────────────────────────────────────────────
function ContactPage({ setView }) {
  const [form, setForm] = useState({ name:"", email:"", phone:"", subject:"Allgemeine Anfrage", message:"" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});
  const subjects = ["Allgemeine Anfrage","Bestellung / Lieferung","Reklamation / Garantie","Rückgabe / Widerruf","Produktfrage","Sonstiges"];
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 1;
    if (!form.email.includes("@")) e.email = 1;
    if (!form.message.trim() || form.message.length < 10) e.message = 1;
    setErrors(e); return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      const response = await fetch("https://formspree.io/f/mzdwqkoa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || "–",
          subject: form.subject,
          message: form.message,
          _replyto: form.email,
          _subject: `MK-Electro Kontakt: ${form.subject} von ${form.name}`,
        }),
      });
      if (response.ok) {
        setSending(false);
        setSent(true);
      } else {
        setSending(false);
        alert("Fehler beim Senden. Bitte versuche es erneut oder schreibe direkt an shop@mk-electro.com");
      }
    } catch {
      setSending(false);
      alert("Verbindungsfehler. Bitte versuche es erneut.");
    }
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-tag"><I d={ICONS.mail} size={12}/> Kontakt</div>
          <h1>So erreichen<br/>Sie uns</h1>
          <p>Wir helfen Ihnen gerne weiter – per E-Mail, Telefon oder Kontaktformular.</p>
        </div>
      </div>
      <div className="page-wrap">
        <div className="contact-grid">
          {/* Info */}
          <div className="contact-info-card">
            <h3>Kontaktdaten</h3>
            <div className="cinfo-row">
              <div className="cinfo-icon"><I d={ICONS.user} size={16}/></div>
              <div><h4>Inhaber</h4><p>Andreas Kraus</p></div>
            </div>
            <div className="cinfo-row">
              <div className="cinfo-icon"><I d={ICONS.mappin} size={16}/></div>
              <div><h4>Adresse</h4><p>Von-Drais-Straße 3a<br/>68775 Ketsch</p></div>
            </div>
            <div className="cinfo-row">
              <div className="cinfo-icon"><I d={ICONS.mail} size={16}/></div>
              <div><h4>E-Mail</h4><a href="mailto:shop@mk-electro.com">shop@mk-electro.com</a></div>
            </div>
            <div className="cinfo-row">
              <div className="cinfo-icon"><I d={ICONS.phone} size={16}/></div>
              <div><h4>Telefon</h4><p>+49 (0) 6202 · 123456</p></div>
            </div>
            <div className="cinfo-row">
              <div className="cinfo-icon"><I d={ICONS.truck} size={16}/></div>
              <div><h4>Öffnungszeiten</h4><p>Mo – Fr: 9:00 – 17:00 Uhr<br/>Sa – So: geschlossen</p></div>
            </div>
            <div style={{marginTop:"1.2rem",padding:"1rem",background:"var(--sf2)",borderRadius:"8px",fontSize:".8rem",color:"var(--mu)",lineHeight:1.6}}>
              <strong style={{color:"var(--tx)"}}>Antwortzeit:</strong> Wir antworten in der Regel innerhalb von 24 Stunden an Werktagen.
            </div>
          </div>

          {/* Form */}
          <div className="contact-form-card">
            <h3>Nachricht senden</h3>
            {sent ? (
              <div className="form-sent">
                <I d={ICONS.check} size={32}/>
                <h3>Nachricht gesendet!</h3>
                <p>Vielen Dank, {form.name}. Wir melden uns baldmöglichst bei Ihnen unter <strong style={{color:"var(--tx)"}}>{form.email}</strong>.</p>
                <button className="btn btn-p btn-sm" style={{marginTop:"1rem"}} onClick={()=>{setSent(false);setForm({name:"",email:"",phone:"",subject:"Allgemeine Anfrage",message:""});}}>
                  Neue Anfrage
                </button>
              </div>
            ) : (
              <>
                <div className="fg"><label>Ihr Name *</label><input className={`fi${errors.name?" err":""}`} placeholder="Max Mustermann" value={form.name} onChange={e=>sf("name",e.target.value)}/></div>
                <div className="fg"><label>E-Mail-Adresse *</label><input className={`fi${errors.email?" err":""}`} type="email" placeholder="max@beispiel.de" value={form.email} onChange={e=>sf("email",e.target.value)}/></div>
                <div className="fg"><label>Telefon (optional)</label><input className="fi" type="tel" placeholder="+49 …" value={form.phone} onChange={e=>sf("phone",e.target.value)}/></div>
                <div className="fg">
                  <label>Betreff</label>
                  <div className="subject-chips">
                    {subjects.map(s=><button key={s} className={`subject-chip${form.subject===s?" on":""}`} onClick={()=>sf("subject",s)}>{s}</button>)}
                  </div>
                </div>
                <div className="fg">
                  <label>Ihre Nachricht *</label>
                  <textarea className={`fi${errors.message?" err":""}`} rows={5} placeholder="Wie können wir Ihnen helfen?" value={form.message} onChange={e=>sf("message",e.target.value)} style={{resize:"vertical"}}/>
                  <div style={{fontSize:".7rem",color:"var(--mu)",marginTop:".25rem"}}>{form.message.length} Zeichen (min. 10)</div>
                </div>
                <div style={{fontSize:".72rem",color:"var(--mu)",marginBottom:".8rem",lineHeight:1.6}}>
                  Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Daten gemäß unserer <button onClick={()=>setView("datenschutz")} style={{background:"none",border:"none",color:"var(--acc)",cursor:"pointer",fontSize:"inherit",padding:0,textDecoration:"underline"}}>Datenschutzerklärung</button> zu.
                </div>
                <button className="btn btn-p" style={{width:"100%"}} onClick={submit} disabled={sending}>
                  <I d={ICONS.send} size={15}/> {sending ? "Wird gesendet…" : "Nachricht absenden"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── IMPRESSUM PAGE ────────────────────────────────────────────────────────────
function ImpressumPage() {
  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-tag"><I d={ICONS.doc} size={12}/> Rechtliches</div>
          <h1>Impressum</h1>
          <p>Angaben gemäß § 5 TMG</p>
        </div>
      </div>
      <div className="page-wrap">
        <div className="imp-card">
          <div className="imp-card-icon"><I d={ICONS.user} size={18}/></div>
          <div>
            <h3>Verantwortlich</h3>
            <p><strong style={{color:"var(--tx)"}}>MK-Electro</strong><br/>
            Inhaber: Andreas Kraus<br/>
            Von-Drais-Straße 3a<br/>
            68775 Ketsch</p>
          </div>
        </div>
        <div className="imp-card">
          <div className="imp-card-icon"><I d={ICONS.phone} size={18}/></div>
          <div>
            <h3>Kontakt</h3>
            <p>Telefon: +49 (0) 6202 · 123456<br/>
            E-Mail: <a href="mailto:shop@mk-electro.com" style={{color:"var(--acc)"}}>shop@mk-electro.com</a></p>
          </div>
        </div>
        <div className="imp-card">
          <div className="imp-card-icon"><I d={ICONS.doc} size={18}/></div>
          <div>
            <h3>Steuerliche Angaben</h3>
            <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br/>
            <strong style={{color:"var(--tx)"}}>DE 123 456 789</strong></p>
          </div>
        </div>

        <div className="legal-section">
          <h2><I d={ICONS.scale} size={16}/> Streitschlichtung</h2>
          <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" style={{color:"var(--acc)"}}>https://ec.europa.eu/consumers/odr</a></p>
          <p>Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
        </div>

        <div className="legal-section">
          <h2><I d={ICONS.doc} size={16}/> Haftung für Inhalte</h2>
          <p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
          <p>Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>
        </div>

        <div className="legal-section">
          <h2><I d={ICONS.link} size={16}/> Haftung für Links</h2>
          <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
        </div>

        <div className="legal-section">
          <h2><I d={ICONS.shield} size={16}/> Urheberrecht</h2>
          <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
        </div>
      </div>
    </>
  );
}

// ── AGB PAGE ──────────────────────────────────────────────────────────────────
function AGBPage({ setView }) {
  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-tag"><I d={ICONS.scale} size={12}/> Rechtliches</div>
          <h1>Allgemeine Geschäftsbedingungen</h1>
          <p>MK-Electro · Inh. Andreas Kraus · Stand: Januar 2026</p>
        </div>
      </div>
      <div className="page-wrap">

        <div className="legal-section">
          <h2>§ 1 Geltungsbereich</h2>
          <p>Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge, die zwischen MK-Electro, Inh. Andreas Kraus, Von-Drais-Straße 3a, 68775 Ketsch (nachfolgend „Verkäufer") und dem Kunden (nachfolgend „Käufer") über den Online-Shop mk-electro.com geschlossen werden.</p>
          <p>Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des Käufers werden nicht Vertragsbestandteil, es sei denn, ihrer Geltung wird ausdrücklich zugestimmt.</p>
        </div>

        <div className="legal-section">
          <h2>§ 2 Vertragsschluss</h2>
          <p>Die Produktdarstellungen im Online-Shop stellen kein rechtlich bindendes Angebot dar, sondern eine Aufforderung zur Abgabe eines Angebots (invitatio ad offerendum).</p>
          <p>Durch Anklicken des Bestellbuttons gibt der Käufer ein verbindliches Angebot zum Kauf der im Warenkorb befindlichen Waren ab. Der Verkäufer bestätigt den Eingang der Bestellung unverzüglich per E-Mail (Eingangsbestätigung). Diese Eingangsbestätigung stellt noch keine Annahme des Angebots dar.</p>
          <p>Ein Kaufvertrag kommt erst zustande, wenn der Verkäufer die Bestellung durch eine gesonderte E-Mail ausdrücklich annimmt oder die Ware versendet.</p>
        </div>

        <div className="legal-section">
          <h2>§ 3 Preise und Zahlung</h2>
          <p>Alle angegebenen Preise sind Endpreise in Euro und enthalten die gesetzliche Umsatzsteuer (19 %). Versandkosten werden im Bestellprozess gesondert ausgewiesen.</p>
          <h3>Zahlungsarten</h3>
          <ul>
            <li><strong>PayPal:</strong> Die Zahlung erfolgt über den Zahlungsdienstleister PayPal (Europe) S.à r.l. et Cie, S.C.A. Es gelten die AGB von PayPal.</li>
            <li><strong>Vorkasse (Banküberweisung):</strong> Der Käufer überweist den Rechnungsbetrag nach Bestelleingang auf das im Bestellprozess angegebene Konto. Die Ware wird erst nach Zahlungseingang versendet. Zahlungsfrist: 7 Tage.</li>
          </ul>
          <p>Bei Zahlungsverzug ist der Verkäufer berechtigt, Verzugszinsen in gesetzlicher Höhe (§ 288 BGB) zu berechnen.</p>
        </div>

        <div className="legal-section">
          <h2>§ 4 Lieferung und Lieferzeiten</h2>
          <p>Die Lieferung erfolgt an die vom Käufer angegebene Lieferadresse. Es gelten die im Produktangebot genannten Lieferzeiten. Diese beginnen, vorbehaltlich anderslautender Vereinbarungen, bei Vorkasse am Tag nach dem Zahlungseingang, bei anderen Zahlungsarten am Tag nach dem Vertragsschluss.</p>
          <div className="legal-highlight">
            <p><strong style={{color:"var(--tx)"}}>Außenlager:</strong> Artikel mit dem Hinweis „Außenlager" werden vom Händlerlager abgerufen. Die angegebene Lieferzeit verlängert sich für diese Artikel um bis zu 2 Werktage gegenüber der Standard-Lieferzeit.</p>
          </div>
          <p>Ist eine Lieferung an den Käufer nicht möglich, weil der gelieferte Artikel nicht durch seine Haustür passt oder der Käufer nicht angetroffen wird, trägt der Käufer die Kosten der Rücksendung.</p>
        </div>

        <div className="legal-section">
          <h2>§ 5 Eigentumsvorbehalt</h2>
          <p>Die gelieferte Ware bleibt bis zur vollständigen Bezahlung Eigentum des Verkäufers.</p>
        </div>

        <div className="legal-section">
          <h2>§ 6 Widerrufsrecht</h2>
          <div className="legal-highlight">
            <p><strong style={{color:"var(--tx)"}}>Widerrufsrecht für Verbraucher:</strong> Verbrauchern steht ein gesetzliches Widerrufsrecht gemäß der nachfolgenden Widerrufsbelehrung zu.</p>
          </div>
          <h3>Widerrufsbelehrung</h3>
          <p><strong style={{color:"var(--tx)"}}>Widerrufsrecht:</strong> Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.</p>
          <p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief, Telefax oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren:</p>
          <div className="legal-highlight">
            <p>MK-Electro · Inh. Andreas Kraus · Von-Drais-Straße 3a · 68775 Ketsch<br/>
            E-Mail: shop@mk-electro.com · Tel.: +49 (0) 6202 · 123456</p>
          </div>
          <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>
          <h3>Folgen des Widerrufs</h3>
          <p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.</p>
        </div>

        <div className="legal-section">
          <h2>§ 7 Gewährleistung und Garantie</h2>
          <p>Es gelten die gesetzlichen Gewährleistungsrechte. Die Verjährungsfrist für Mängelansprüche bei neuen Waren beträgt zwei Jahre ab Lieferung.</p>
          <p>Soweit Hersteller eine darüber hinausgehende Garantie gewähren, wird diese gesondert bei dem jeweiligen Produkt ausgewiesen. Eine solche Garantie begründet zusätzliche Ansprüche des Käufers neben den gesetzlichen Gewährleistungsrechten.</p>
        </div>

        <div className="legal-section">
          <h2>§ 8 Haftungsbeschränkung</h2>
          <p>Schadensersatzansprüche des Käufers sind ausgeschlossen, soweit nachfolgend nichts anderes bestimmt ist. Der vorstehende Haftungsausschluss gilt auch zugunsten der gesetzlichen Vertreter und Erfüllungsgehilfen des Verkäufers, sofern der Käufer Ansprüche gegen diese geltend macht.</p>
          <p>Von dem Haftungsausschluss ausgenommen sind Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie Schäden durch Verletzung wesentlicher Vertragspflichten.</p>
        </div>

        <div className="legal-section">
          <h2>§ 9 Datenschutz</h2>
          <p>Informationen zur Verarbeitung Ihrer personenbezogenen Daten finden Sie in unserer <button onClick={()=>setView("datenschutz")} style={{background:"none",border:"none",color:"var(--acc)",cursor:"pointer",fontSize:"inherit",padding:0,textDecoration:"underline"}}>Datenschutzerklärung</button>.</p>
        </div>

        <div className="legal-section">
          <h2>§ 10 Anwendbares Recht und Gerichtsstand</h2>
          <p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gegenüber Verbrauchern gilt diese Rechtswahl nur insoweit, als hierdurch nicht der durch zwingende Bestimmungen des Rechts des Staates des gewöhnlichen Aufenthalts des Verbrauchers gewährte Schutz entzogen wird.</p>
          <p>Gerichtsstand ist Schwetzingen, sofern der Käufer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.</p>
        </div>

        <div className="legal-section">
          <h2>§ 11 Streitbeilegung</h2>
          <p>Die EU-Kommission stellt eine Plattform für außergerichtliche Online-Streitbeilegung bereit: <a href="https://ec.europa.eu/consumers/odr" style={{color:"var(--acc)"}}>https://ec.europa.eu/consumers/odr</a>. Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir weder bereit noch verpflichtet.</p>
        </div>
      </div>
    </>
  );
}

// ── DATENSCHUTZ PAGE ──────────────────────────────────────────────────────────
function DatenschutzPage() {
  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="page-hero-tag"><I d={ICONS.shield} size={12}/> Rechtliches</div>
          <h1>Datenschutzerklärung</h1>
          <p>Gemäß DSGVO und BDSG · Stand: Januar 2026</p>
        </div>
      </div>
      <div className="page-wrap">
        <div className="legal-section">
          <h2>§ 1 Verantwortlicher</h2>
          <div className="legal-highlight">
            <p>MK-Electro · Inh. Andreas Kraus · Von-Drais-Straße 3a · 68775 Ketsch<br/>
            E-Mail: shop@mk-electro.com · Tel.: +49 (0) 6202 · 123456</p>
          </div>
        </div>
        <div className="legal-section">
          <h2>§ 2 Erhebung und Verarbeitung personenbezogener Daten</h2>
          <p>Wir erheben personenbezogene Daten nur, soweit dies zur Begründung, inhaltlichen Ausgestaltung oder Änderung des Rechtsverhältnisses erforderlich ist (Bestandsdaten). Personenbezogene Daten über die Inanspruchnahme unserer Seiten (Nutzungsdaten) erheben, verarbeiten und nutzen wir nur, soweit dies erforderlich ist, um dem Nutzer die Inanspruchnahme des Dienstes zu ermöglichen oder abzurechnen.</p>
          <h3>Bei Bestellungen erheben wir folgende Daten:</h3>
          <ul>
            <li>Name und Anschrift</li>
            <li>E-Mail-Adresse</li>
            <li>Zahlungsdaten (bei PayPal über PayPal erhoben)</li>
            <li>Bestelldaten (Artikel, Mengen, Preise)</li>
          </ul>
        </div>
        <div className="legal-section">
          <h2>§ 3 Rechtsgrundlage der Verarbeitung</h2>
          <p>Die Verarbeitung Ihrer Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung, z. B. steuerrechtliche Aufbewahrungspflichten).</p>
        </div>
        <div className="legal-section">
          <h2>§ 4 Speicherdauer</h2>
          <p>Ihre personenbezogenen Daten werden gelöscht oder gesperrt, sobald der Zweck der Speicherung entfällt. Eine Speicherung kann darüber hinaus dann erfolgen, wenn dies durch den europäischen oder nationalen Gesetzgeber in unionsrechtlichen Verordnungen, Gesetzen oder sonstigen Vorschriften, denen der Verantwortliche unterliegt, vorgesehen wurde. Eine Sperrung oder Löschung der Daten erfolgt auch dann, wenn eine durch die genannten Normen vorgeschriebene Speicherfrist abläuft, es sei denn, dass eine Erforderlichkeit zur weiteren Speicherung der Daten für einen Vertragsabschluss oder eine Vertragserfüllung besteht.</p>
        </div>
        <div className="legal-section">
          <h2>§ 5 Ihre Rechte</h2>
          <p>Sie haben jederzeit das Recht auf:</p>
          <ul>
            <li>Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
            <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
            <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
            <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
          </ul>
          <p>Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: shop@mk-electro.com</p>
          <p>Unbeschadet eines anderweitigen verwaltungsrechtlichen oder gerichtlichen Rechtsbehelfs steht Ihnen das Recht auf Beschwerde bei einer Aufsichtsbehörde zu. Die zuständige Aufsichtsbehörde ist der <strong style={{color:"var(--tx)"}}>Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg</strong>.</p>
        </div>
        <div className="legal-section">
          <h2>§ 6 Zahlungsdienstleister PayPal</h2>
          <p>Zur Abwicklung von Zahlungen nutzen wir den Dienst PayPal (PayPal (Europe) S.à r.l. et Cie, S.C.A., 22-24 Boulevard Royal, L-2449 Luxembourg). Bei Nutzung von PayPal werden Ihre Daten an PayPal übermittelt. Es gelten die Datenschutzbestimmungen von PayPal: <a href="https://www.paypal.com/de/webapps/mpp/ua/privacy-full" style={{color:"var(--acc)"}}>https://www.paypal.com/de/datenschutz</a></p>
        </div>
        <div className="legal-section">
          <h2>§ 7 Cookies</h2>
          <p>Diese Website verwendet technisch notwendige Cookies, um den Warenkorb und Sitzungsdaten zu speichern. Diese Cookies sind für den Betrieb des Shops erforderlich und können nicht deaktiviert werden. Es werden keine Marketing- oder Tracking-Cookies eingesetzt.</p>
        </div>
      </div>
    </>
  );
}

// ── SHOP VIEW ─────────────────────────────────────────────────────────────────
function ShopView({ products, categories, category, search, setCategory, setSearch, addToCart, setView }) {
  const [detailProduct, setDetailProduct] = useState(null);
  return (
    <>
      <section className="hero">
        <div className="hero-tag"><I d={ICONS.tag} size={12}/> Markentechnik · Direkt vom Großhandel</div>
        <h1>Echte Marken.<br/><em>Faire Preise.</em></h1>
        <p>Braun, Philips, Pioneer, Remington – Originalware mit voller Herstellergarantie.</p>
        <div className="hero-btns">
          <button className="btn btn-p" onClick={()=>document.querySelector(".filters")?.scrollIntoView({behavior:"smooth"})}>Zum Sortiment →</button>
        </div>
      </section>

      <div className="filters">
        <div className="sw"><I d={ICONS.search} size={15}/><input className="si" placeholder="Suchen …" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="chips">
          {categories.map(c=><button key={c} className={`chip${category===c?" on":""}`} onClick={()=>setCategory(c)}>{c}</button>)}
        </div>
      </div>

      <div className="pgrid">
        {products.length===0 && <p style={{color:"var(--mu)",gridColumn:"1/-1",padding:"2rem"}}>Keine Produkte gefunden.</p>}
        {products.map(p=><ProductCard key={p.id} p={p} onAddToCart={addToCart} onOpenDetail={setDetailProduct}/>)}
      </div>

      {detailProduct && (
        <ProductDetailModal
          p={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAddToCart={(prod) => { addToCart(prod); }}
        />
      )}

      <div className="trust">
        {[["Sichere Zahlung",ICONS.shield],["Schnelle Lieferung",ICONS.truck],["Originalware & Garantie",ICONS.check]].map(([l,d],i)=>(
          <div key={i} className="ti"><I d={d} size={15}/>{l}</div>
        ))}
      </div>

      <footer>
        <div className="footer-main">
          <div className="footer-col">
            <h4>MK·Electro</h4>
            <p>Ihr Fachhändler für Multimedia & Elektroartikel. Originalware mit Herstellergarantie.</p>
            <p style={{marginTop:".6rem"}}>Inh. Andreas Kraus<br/>Von-Drais-Straße 3a<br/>68775 Ketsch</p>
          </div>
          <div className="footer-col">
            <h4>Shop</h4>
            <a onClick={()=>setView("shop")} style={{cursor:"pointer"}}>Alle Produkte</a>
            <a onClick={()=>setView("contact")} style={{cursor:"pointer"}}>Kontakt</a>
          </div>
          <div className="footer-col">
            <h4>Rechtliches</h4>
            <a onClick={()=>setView("impressum")} style={{cursor:"pointer"}}>Impressum</a>
            <a onClick={()=>setView("agb")} style={{cursor:"pointer"}}>AGB</a>
            <a onClick={()=>setView("datenschutz")} style={{cursor:"pointer"}}>Datenschutz</a>
          </div>
          <div className="footer-col">
            <h4>Kontakt</h4>
            <p>shop@mk-electro.com</p>
            <p>+49 (0) 6202 · 123456</p>
            <p>Mo–Fr: 9:00–17:00 Uhr</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 MK-Electro · Inh. Andreas Kraus · Alle Rechte vorbehalten</span>
          <div className="footer-bottom-links">
            <button onClick={()=>setView("impressum")}>Impressum</button>
            <button onClick={()=>setView("agb")}>AGB</button>
            <button onClick={()=>setView("datenschutz")}>Datenschutz</button>
            <button onClick={()=>setView("contact")}>Kontakt</button>
          </div>
        </div>
      </footer>

    </>
  );
}

// ── BACKEND VIEW ──────────────────────────────────────────────────────────────
function BackendView({ products, orders, beSection, setBeSection, productModal, setProductModal, orderModal, setOrderModal, invoiceModal, setInvoiceModal, saveProduct, deleteProduct, updateOrderStatus, updateOrderDetails, deleteCustomer }) {
  const revenue = orders.filter(o=>o.status!=="Storniert").reduce((s,o)=>s+o.total,0);
  const statusClass = { "Neu":"s-new","Bezahlt":"s-paid","Versendet":"s-ship","Storniert":"s-canc" };

  // Load registered users from Supabase view
  const [regUsers, setRegUsers] = useState([]);
  const [regLoading, setRegLoading] = useState(true);
  const [nlList, setNlList] = useState([]);
  const [nlLoading, setNlLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [
          { data: users, error: ue },
          { data: nl, error: ne },
        ] = await Promise.all([
          supabase.from("registered_users").select("*"),
          supabase.from("newsletter_subscribers").select("*"),
        ]);
        if (!ue) setRegUsers(users || []);
        if (!ne) setNlList(nl || []);
      } catch(e) { console.error("Laden fehlgeschlagen:", e); }
      setRegLoading(false);
      setNlLoading(false);
    })();
  }, [beSection]);

  // Delete user via Edge Function (deletes from auth.users + orders)
  const deleteUserById = async (userId, email) => {
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId, email },
      });
      if (error) throw error;
    } catch(e) {
      console.error("Löschen fehlgeschlagen:", e);
      alert("Fehler beim Löschen: " + e.message);
      return;
    }
    setRegUsers(u => u.filter(u => u.id !== userId));
    deleteCustomer(email);
  };

  // Newsletter list comes from Supabase view (nlList)
  const newsletterList = nlList;

  return (
    <div className="be-wrap">
      <aside className="be-side">
        <div className="be-side-ttl">Navigation</div>
        {[
          {k:"dashboard",  l:"Dashboard",   d:ICONS.home},
          {k:"products",   l:"Produkte",    d:ICONS.box},
          {k:"orders",     l:"Bestellungen",d:ICONS.orders},
          {k:"customers",  l:"Kunden",      d:ICONS.users},
          {k:"newsletter", l:"Newsletter",  d:ICONS.newsletter},
        ].map(item=>(
          <div key={item.k} className={`bni${beSection===item.k?" on":""}`} onClick={()=>setBeSection(item.k)}>
            <I d={item.d} size={15}/>{item.l}
            {item.k==="orders" && orders.filter(o=>o.status==="Neu").length>0 && (
              <span className="badge" style={{marginLeft:"auto",background:"var(--acc2)"}}>{orders.filter(o=>o.status==="Neu").length}</span>
            )}
            {item.k==="customers" && regUsers.length>0 && (
              <span className="badge" style={{marginLeft:"auto",background:"var(--inf)"}}>{regUsers.length}</span>
            )}
            {item.k==="newsletter" && newsletterList.length>0 && (
              <span className="badge" style={{marginLeft:"auto",background:"var(--ok)"}}>{newsletterList.length}</span>
            )}
          </div>
        ))}
      </aside>

      <div className="be-ct">
        {/* DASHBOARD */}
        {beSection==="dashboard" && (
          <>
            <div className="be-hdr"><div className="be-ttl">Dashboard</div></div>
            <div className="stats">
              {[
                ["Produkte",products.length,"im Sortiment"],
                ["Bestellungen",orders.length,"gesamt"],
                ["Umsatz",revenue.toFixed(0)+" €","inkl. MwSt."],
                ["Registrierte Kunden",regUsers.length,"Konten"],
                ["Lager (gesamt)",products.reduce((s,p)=>s+(parseInt(p.stock)||0)+(parseInt(p.stockExternal)||0),0),`davon AL: ${products.reduce((s,p)=>s+(parseInt(p.stockExternal)||0),0)} Stk.`]
              ].map(([l,v,s])=>(
                <div key={l} className="sc"><div className="sc-lbl">{l}</div><div className="sc-val">{v}</div><div className="sc-sub">{s}</div></div>
              ))}
            </div>

            {/* Recent orders */}
            <h3 style={{fontFamily:"Barlow Condensed",fontWeight:800,marginBottom:"1rem",fontSize:"1rem",color:"var(--mu)",textTransform:"uppercase",letterSpacing:"1px"}}>
              Neue Bestellungen
            </h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Bestell-Nr.</th><th>Datum</th><th>Kunde</th><th>Summe</th><th>Status</th><th>Aktionen</th></tr></thead>
                <tbody>
                  {orders.slice(0,6).map(o=>(
                    <tr key={o.id}>
                      <td style={{fontFamily:"monospace",color:"var(--acc)",fontSize:".78rem"}}>{o.id}</td>
                      <td>{o.date}</td><td>{o.customer?.name}</td>
                      <td style={{fontWeight:700}}>{fmt(o.total)}</td>
                      <td><span className={`spill ${statusClass[o.status]||"s-new"}`}>{o.status}</span></td>
                      <td>
                        <div className="acts">
                          <button className="btn btn-o btn-sm" onClick={()=>{setOrderModal(o);setBeSection("orders");}}>
                            <I d={ICONS.eye} size={12}/> Details
                          </button>
                          <button className="btn btn-i btn-sm" onClick={()=>setInvoiceModal(o)}>
                            <I d={ICONS.invoice} size={12}/> Rechnung
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length===0 && <tr><td colSpan={6} style={{color:"var(--mu)",textAlign:"center",padding:"2rem"}}>Noch keine Bestellungen.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* PRODUCTS */}
        {beSection==="products" && (
          <>
            <div className="be-hdr">
              <div className="be-ttl">Produkte</div>
              <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
                {["Alle","Mediaelectronics Spain","dbreactor"].map(s=>(
                  <button key={s}
                    className={`chip${(beSection==="products_supplier"?beSection:s)==="Alle"?"":""}`}
                    style={{fontSize:".72rem",padding:".25rem .65rem",borderRadius:"99px",cursor:"pointer",border:"1px solid var(--br)",
                      background: s==="dbreactor" ? "rgba(59,130,246,.1)" : s==="Mediaelectronics Spain" ? "rgba(232,160,32,.1)" : "var(--sf2)",
                      color: s==="dbreactor" ? "var(--inf)" : s==="Mediaelectronics Spain" ? "var(--acc)" : "var(--tx)",
                    }}
                    onClick={()=>{
                      const tbody = document.querySelectorAll('.tbl tbody tr');
                      tbody.forEach(row=>{
                        if(s==="Alle") { row.style.display=""; return; }
                        const badge = row.querySelector('td:nth-child(4) span');
                        row.style.display = badge && badge.textContent.includes(s) ? "" : "none";
                      });
                    }}>
                    {s==="Alle"?"Alle Lieferanten":s}
                  </button>
                ))}
                <button className="btn btn-p btn-sm" onClick={()=>setProductModal({})}><I d={ICONS.plus} size={14}/> Neues Produkt</button>
              </div>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th></th><th>Name & SKU</th><th>Kat.</th><th>Lieferant</th><th>EK</th><th>Versand</th><th>VK</th><th>eBay</th><th>Netto-Marge</th><th>Eig.Lager</th><th>Außenlager</th><th>Gesamt</th><th>Bilder</th><th>Aktionen</th></tr></thead>
                <tbody>
                  {products.map(p=>{
                    const imgs = p.images || [p.image].filter(Boolean);
                    const m = calcMargin(p.price, p.ek, p.shipping);
                    const { local, ext, total } = stockInfo(p);
                    const mColor = !m ? "var(--mu)" : m.pct >= 25 ? "var(--ok)" : m.pct >= 15 ? "var(--acc)" : "var(--err)";
                    const supplierColor = p.supplier === "dbreactor" ? "var(--inf)" : p.supplier === "Mediaelectronics Spain" ? "var(--acc)" : "var(--mu)";
                    return (
                      <tr key={p.id}>
                        <td><img className="thumb" src={imgs[0]||"https://placehold.co/36x36/161b23/6e7d96?text=?"} alt="" onError={e=>e.target.src="https://placehold.co/36x36/161b23/6e7d96?text=?"}/></td>
                        <td>
                          <div style={{fontWeight:600,fontSize:".83rem"}}>{p.name}</div>
                          {p.sku && <div style={{fontSize:".68rem",color:"var(--mu)",fontFamily:"monospace"}}>#{p.sku}</div>}
                        </td>
                        <td style={{color:"var(--mu)",fontSize:".8rem"}}>{p.category}</td>
                        <td>
                          {p.supplier
                            ? <span style={{fontSize:".72rem",fontWeight:600,color:supplierColor,background:`${supplierColor}18`,border:`1px solid ${supplierColor}30`,borderRadius:"5px",padding:".15rem .45rem",whiteSpace:"nowrap"}}>
                                {p.supplier}
                              </span>
                            : <span style={{color:"var(--mu)",fontSize:".75rem"}}>—</span>
                          }
                        </td>
                        <td style={{color:"var(--mu)",fontSize:".8rem"}}>{p.ek?fmt(p.ek):"—"}</td>
                        <td style={{color:"var(--mu)",fontSize:".78rem"}}>{p.shipping?fmt(p.shipping):"—"}</td>
                        <td style={{color:"var(--acc)",fontWeight:700}}>{fmt(p.price)}</td>
                        <td style={{color:"var(--mu)",fontSize:".78rem"}}>{m?fmt(m.ebay):"—"}</td>
                        <td>
                          {m ? <span style={{color:mColor,fontWeight:700,fontSize:".82rem"}}>{fmt(m.netto)} <span style={{fontSize:".65rem",opacity:.75}}>({m.pct}%)</span></span> : "—"}
                        </td>
                        <td><span className={`sbadge ${local>8?"sok":local>0?"slow":"sout"}`}>{local} Stk.</span></td>
                        <td>
                          {ext > 0
                            ? <span className="ext-badge"><I d={ICONS.box} size={11}/>{ext} Stk.</span>
                            : <span style={{color:"var(--mu)",fontSize:".78rem"}}>—</span>
                          }
                        </td>
                        <td style={{fontWeight:700,fontSize:".85rem"}}>{total}</td>
                        <td style={{color:"var(--mu)",fontSize:".78rem"}}>{imgs.length} Bild{imgs.length!==1?"er":""}</td>
                        <td>
                          <div className="acts">
                            <button className="btn btn-o btn-sm" onClick={()=>setProductModal(p)}><I d={ICONS.edit} size={12}/></button>
                            <button className="btn btn-d btn-sm" onClick={()=>{if(confirm("Löschen?"))deleteProduct(p.id)}}><I d={ICONS.trash} size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ORDERS */}
        {beSection==="orders" && (
          <>
            <div className="be-hdr"><div className="be-ttl">Bestellungen</div></div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Bestell-Nr.</th><th>Datum</th><th>Kunde</th><th>E-Mail</th><th>Zahlung</th><th>Summe</th><th>Status</th><th>Aktionen</th></tr></thead>
                <tbody>
                  {orders.map(o=>(
                    <tr key={o.id}>
                      <td style={{fontFamily:"monospace",color:"var(--acc)",fontSize:".78rem"}}>{o.id}</td>
                      <td>{o.date}</td>
                      <td style={{fontWeight:600}}>{o.customer?.name}</td>
                      <td style={{color:"var(--mu)",fontSize:".78rem"}}>{o.customer?.email}</td>
                      <td style={{textTransform:"capitalize",color:"var(--mu)",fontSize:".8rem"}}>{o.payment}</td>
                      <td style={{fontWeight:700}}>{fmt(o.total)}</td>
                      <td>
                        <span className={`spill ${statusClass[o.status]||"s-new"}`}>{o.status}</span>
                        {o.carrier && <div style={{fontSize:".7rem",color:"var(--mu)",marginTop:".15rem"}}><I d={ICONS.truck} size={10}/> {o.carrier}</div>}
                        {o.tracking_number && <div style={{fontSize:".68rem",fontFamily:"monospace",color:"var(--inf)",marginTop:".1rem"}}>{o.tracking_number}</div>}
                      </td>
                      <td>
                        <div className="acts">
                          <button className="btn btn-o btn-sm" onClick={()=>setOrderModal(o)}>
                            <I d={ICONS.eye} size={12}/> Details
                          </button>
                          <button className="btn btn-i btn-sm" onClick={()=>setInvoiceModal(o)}>
                            <I d={ICONS.invoice} size={12}/> Rechnung
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length===0 && <tr><td colSpan={8} style={{color:"var(--mu)",textAlign:"center",padding:"2rem"}}>Noch keine Bestellungen.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
        {/* CUSTOMERS */}
        {beSection==="customers" && (
          <CustomersSection
            orders={orders}
            regUsers={regUsers}
            regLoading={regLoading}
            setOrderModal={setOrderModal}
            setInvoiceModal={setInvoiceModal}
            deleteCustomer={deleteCustomer}
            deleteUserById={deleteUserById}
          />
        )}

        {/* NEWSLETTER */}
        {beSection==="newsletter" && (
          <NewsletterSection newsletterList={newsletterList} deleteCustomer={deleteCustomer} />
        )}
      </div>

      {/* MODALS */}
      {productModal!==null && <ProductModal product={productModal} onSave={saveProduct} onClose={()=>setProductModal(null)}/>}
      {orderModal && <OrderModal order={orderModal} onClose={()=>setOrderModal(null)} onStatusChange={updateOrderStatus} onSaveDetails={updateOrderDetails} onOpenInvoice={()=>{setInvoiceModal(orderModal);setOrderModal(null);}}/>}
      {invoiceModal && <InvoiceModal order={invoiceModal} onClose={()=>setInvoiceModal(null)}/>}
    </div>
  );
}

// ── CUSTOMER AUTH PAGE ────────────────────────────────────────────────────────
function CustomerAuthPage({ onLogin, setView }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({
    name:"", email:"", phone:"", street:"", zip:"", city:"",
    password:"", password2:"",
  });
  const [consentDaten, setConsentDaten] = useState(false);
  const [consentNewsletter, setConsentNewsletter] = useState(false);
  const [consentErr, setConsentErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError("Bitte E-Mail und Passwort eingeben."); return; }
    setLoading(true); setError("");
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      });
      if (err) throw err;
      onLogin(data.user);
    } catch(e) {
      setError(e.message === "Invalid login credentials"
        ? "E-Mail oder Passwort ist falsch."
        : e.message || "Anmeldung fehlgeschlagen.");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!form.name.trim()) { setError("Bitte Ihren Namen eingeben."); return; }
    if (!form.email.includes("@")) { setError("Bitte eine gültige E-Mail eingeben."); return; }
    if (!form.street.trim()) { setError("Bitte Ihre Straße eingeben."); return; }
    if (!form.zip.trim() || !form.city.trim()) { setError("Bitte PLZ und Ort eingeben."); return; }
    if (form.password.length < 6) { setError("Passwort muss mindestens 6 Zeichen haben."); return; }
    if (form.password !== form.password2) { setError("Passwörter stimmen nicht überein."); return; }
    if (!consentDaten) { setConsentErr(true); setError("Bitte stimmen Sie der Datenverarbeitung zu."); return; }
    setLoading(true); setError(""); setConsentErr(false);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: {
          data: {
            full_name: form.name,
            phone: form.phone,
            street: form.street,
            zip: form.zip,
            city: form.city,
            newsletter: consentNewsletter,
          },
        },
      });
      if (err) throw err;
      if (data.user && !data.session) {
        setSuccess("Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse und loggen Sie sich dann ein.");
        setTab("login");
      } else if (data.session) {
        onLogin(data.user);
      }
    } catch(e) {
      setError(e.message.includes("already registered")
        ? "Diese E-Mail-Adresse ist bereits registriert."
        : e.message || "Registrierung fehlgeschlagen.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box" style={{maxWidth:"520px",width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:"1.3rem"}}>
          <div style={{width:"48px",height:"48px",background:"rgba(232,160,32,.12)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto .8rem",color:"var(--acc)"}}>
            <I d={ICONS.user} size={22}/>
          </div>
          <h2 style={{marginBottom:".2rem"}}>{tab==="login" ? "Mein Konto" : "Registrieren"}</h2>
          <p style={{marginBottom:0}}>{tab==="login" ? "Einloggen um Bestellungen einzusehen" : "Kostenloses Kundenkonto erstellen"}</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab==="login"?" on":""}`} onClick={()=>{setTab("login");setError("");setSuccess("");setConsentErr(false);}}>Einloggen</button>
          <button className={`auth-tab${tab==="register"?" on":""}`} onClick={()=>{setTab("register");setError("");setSuccess("");setConsentErr(false);}}>Registrieren</button>
        </div>

        {error && <div className="auth-err"><I d={ICONS.x} size={14}/>{error}</div>}
        {success && <div className="auth-ok"><I d={ICONS.check} size={14}/>{success}</div>}

        {/* REGISTER FORM */}
        {tab === "register" && (
          <>
            <div style={{fontSize:".72rem",color:"var(--mu)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:".6rem"}}>Persönliche Daten</div>
            <div className="fg">
              <label>Vor- & Nachname *</label>
              <input className="fi" placeholder="Max Mustermann" value={form.name} onChange={e=>sf("name",e.target.value)}/>
            </div>
            <div className="fr">
              <div className="fg">
                <label>E-Mail-Adresse *</label>
                <input className="fi" type="email" placeholder="max@beispiel.de" value={form.email} onChange={e=>sf("email",e.target.value)}/>
              </div>
              <div className="fg">
                <label>Telefon (optional)</label>
                <input className="fi" type="tel" placeholder="+49 6202 …" value={form.phone} onChange={e=>sf("phone",e.target.value)}/>
              </div>
            </div>

            <div style={{fontSize:".72rem",color:"var(--mu)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:".6rem",marginTop:".8rem"}}>Adresse</div>
            <div className="fg">
              <label>Straße & Hausnummer *</label>
              <input className="fi" placeholder="Musterstraße 12" value={form.street} onChange={e=>sf("street",e.target.value)}/>
            </div>
            <div className="fr">
              <div className="fg">
                <label>PLZ *</label>
                <input className="fi" placeholder="12345" value={form.zip} onChange={e=>sf("zip",e.target.value)}/>
              </div>
              <div className="fg">
                <label>Ort *</label>
                <input className="fi" placeholder="Musterstadt" value={form.city} onChange={e=>sf("city",e.target.value)}/>
              </div>
            </div>

            <div style={{fontSize:".72rem",color:"var(--mu)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:".6rem",marginTop:".8rem"}}>Zugangsdaten</div>
            <div className="fg">
              <label>Passwort * (min. 6 Zeichen)</label>
              <input className="fi" type="password" placeholder="Passwort wählen" value={form.password} onChange={e=>sf("password",e.target.value)}/>
            </div>
            <div className="fg">
              <label>Passwort bestätigen *</label>
              <input className="fi" type="password" placeholder="Passwort wiederholen" value={form.password2}
                onChange={e=>sf("password2",e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleRegister()}/>
            </div>

            {/* Einverständnisse */}
            <div style={{marginTop:".85rem"}} className="chk-consent">
              {/* Pflicht: Datenschutz */}
              <div
                className={`chk-consent-row required${consentDaten?" checked":""}${consentErr&&!consentDaten?" err-border":""}`}
                onClick={()=>{setConsentDaten(v=>!v);setConsentErr(false);setError("");}}>
                <div className={`chk-box-input${consentDaten?" checked":""}`}>
                  {consentDaten && <I d={ICONS.check} size={11} sw={3}/>}
                </div>
                <div className="chk-consent-txt">
                  <strong>Einverständnis Datenverarbeitung *</strong><br/>
                  Ich stimme zu, dass meine personenbezogenen Daten zur Kontoführung und Bestellabwicklung gemäß der{" "}
                  <span style={{color:"var(--acc)",textDecoration:"underline",cursor:"pointer"}}
                    onClick={e=>{e.stopPropagation();setView("datenschutz");}}>
                    Datenschutzerklärung
                  </span>{" "}
                  verarbeitet werden. Diese Zustimmung ist zur Kontoerstellung erforderlich.
                </div>
              </div>

              {/* Optional: Newsletter */}
              <div
                className={`chk-consent-row${consentNewsletter?" checked":""}`}
                onClick={()=>setConsentNewsletter(v=>!v)}>
                <div className={`chk-box-input${consentNewsletter?" checked-opt":""}`}>
                  {consentNewsletter && <I d={ICONS.check} size={11} sw={3}/>}
                </div>
                <div className="chk-consent-txt">
                  <strong>Newsletter abonnieren</strong>{" "}
                  <span style={{fontWeight:400,color:"var(--mu)"}}>(optional)</span><br/>
                  Ja, ich möchte den MK-Electro Newsletter mit Angeboten und Neuigkeiten per E-Mail erhalten. Abmeldung jederzeit möglich.
                </div>
              </div>

              <div style={{fontSize:".72rem",color:"var(--mu)",marginTop:".3rem"}}>* Pflichtfeld</div>
            </div>
          </>
        )}

        {/* LOGIN FORM */}
        {tab === "login" && (
          <>
            <div className="fg">
              <label>E-Mail-Adresse</label>
              <input className="fi" type="email" placeholder="max@beispiel.de" value={form.email}
                onChange={e=>sf("email",e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            </div>
            <div className="fg">
              <label>Passwort</label>
              <input className="fi" type="password" placeholder="Ihr Passwort" value={form.password}
                onChange={e=>sf("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
            </div>
          </>
        )}

        <button className="btn btn-p" style={{width:"100%",justifyContent:"center",marginTop:".75rem",padding:".75rem",fontSize:"1rem"}}
          onClick={tab==="login"?handleLogin:handleRegister} disabled={loading}>
          {loading ? "Bitte warten…" : tab==="login" ? "Einloggen" : "Konto erstellen"}
        </button>

        <div style={{textAlign:"center",marginTop:"1rem",fontSize:".78rem",color:"var(--mu)"}}>
          {tab==="login"
            ? <>Noch kein Konto? <button className="nb" style={{padding:"0",color:"var(--acc)",display:"inline",fontSize:".78rem"}} onClick={()=>{setTab("register");setError("");}}>Jetzt registrieren</button></>
            : <>Bereits registriert? <button className="nb" style={{padding:"0",color:"var(--acc)",display:"inline",fontSize:".78rem"}} onClick={()=>{setTab("login");setError("");}}>Einloggen</button></>
          }
        </div>
        <div style={{textAlign:"center",marginTop:".6rem"}}>
          <button className="nb" style={{fontSize:".78rem",color:"var(--mu)"}} onClick={()=>setView("shop")}>← Zurück zum Shop</button>
        </div>
      </div>
    </div>
  );
}

// ── CUSTOMER ACCOUNT PAGE ─────────────────────────────────────────────────────
function CustomerAccountPage({ user, orders, onLogout, setView }) {
  const initials = (user?.user_metadata?.full_name || user?.email || "K")
    .split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Kunde";
  const email = user?.email || "";

  // Newsletter
  const [newsletter, setNewsletter] = useState(user?.user_metadata?.newsletter === true);
  const [nlSaving, setNlSaving] = useState(false);
  const [nlMsg, setNlMsg] = useState("");
  // Expanded order detail
  const [expandedOrder, setExpandedOrder] = useState(null);

  const toggleNewsletter = async () => {
    setNlSaving(true); setNlMsg("");
    const newVal = !newsletter;
    try {
      const { error } = await supabase.auth.updateUser({ data: { newsletter: newVal } });
      if (error) throw error;
      setNewsletter(newVal);
      setNlMsg(newVal ? "Newsletter erfolgreich abonniert." : "Newsletter erfolgreich abgemeldet.");
    } catch(e) { setNlMsg("Fehler: " + e.message); }
    setNlSaving(false);
    setTimeout(() => setNlMsg(""), 3000);
  };

  const myOrders = orders.filter(o =>
    o.customer?.email?.toLowerCase() === email.toLowerCase()
  ).sort((a,b) => b.id.localeCompare(a.id));

  const timelineSteps = ["Neu","Bezahlt","Versendet","Zugestellt"];
  const getStepState = (step, currentStatus) => {
    if (currentStatus === "Storniert") return step === "Neu" ? "canc" : "none";
    const idx = timelineSteps.indexOf(currentStatus);
    const stepIdx = timelineSteps.indexOf(step);
    if (stepIdx < idx) return "done";
    if (stepIdx === idx) return "active";
    return "none";
  };
  const statusClass = { "Neu":"s-new","Bezahlt":"s-paid","Versendet":"s-ship","Zugestellt":"s-paid","Storniert":"s-canc" };

  // Download invoice as printable HTML
  const downloadInvoice = (o) => {
    const invoiceNr = "RE-" + o.id.replace("MKE-","") + "-1";
    const html = generateInvoiceHTML(o, invoiceNr);
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html lang="de"><head>
      <meta charset="UTF-8"/>
      <title>Rechnung ${invoiceNr}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=Barlow:wght@300;400;500;600&display=swap');
        body{font-family:'Barlow',sans-serif;background:#fff;margin:0;padding:2rem;color:#111}
        .inv-preview{max-width:800px;margin:0 auto}
        .inv-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:2px solid #e8a020}
        .inv-company h2{font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;color:#e8a020;margin:0 0 .2rem}
        .inv-company p,.inv-meta{font-size:.75rem;color:#555;margin:0}
        .inv-meta{text-align:right}.inv-meta strong{display:block;font-size:1rem;color:#111;font-family:'Barlow Condensed';font-weight:900}
        .inv-addrs{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.4rem}
        .inv-addr h4{font-size:.7rem;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 .3rem}
        .inv-addr p{font-size:.82rem;color:#222;margin:0}
        .inv-tbl{width:100%;border-collapse:collapse;margin-bottom:1.2rem}
        .inv-tbl th{background:#f5f5f5;padding:.5rem .7rem;text-align:left;font-size:.72rem;text-transform:uppercase;color:#666;border-bottom:2px solid #e8a020}
        .inv-tbl td{padding:.45rem .7rem;border-bottom:1px solid #eee;font-size:.8rem}
        .inv-tbl tfoot td{border-top:2px solid #e8a020;font-weight:700;font-size:.88rem}
        .inv-footer{margin-top:1.2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.72rem;color:#888;text-align:center}
        .inv-bank{background:#fffbf2;border:1px solid #e8a020;border-radius:6px;padding:.7rem;margin:.8rem 0;font-size:.75rem}
        @media print{body{padding:.5rem}}
      </style>
    </head><body>${html}<br/><button onclick="window.print()" style="margin-top:1rem;padding:.5rem 1.5rem;background:#e8a020;border:none;border-radius:6px;cursor:pointer;font-size:.9rem;font-family:Barlow,sans-serif">🖨️ Drucken / Als PDF speichern</button></body></html>`);
    win.document.close();
  };

  return (
    <div style={{background:"var(--bg)",minHeight:"calc(100vh - 58px)"}}>
      <div className="acc-wrap">

        {/* Header */}
        <div className="acc-header">
          <div className="acc-avatar">{initials}</div>
          <div style={{flex:1}}>
            <div className="acc-name">{name}</div>
            <div className="acc-email">{email}</div>
            {user?.user_metadata?.street && (
              <div style={{fontSize:".75rem",color:"var(--mu)",marginTop:".15rem"}}>
                📍 {user.user_metadata.street}, {user.user_metadata.zip} {user.user_metadata.city}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
            <button className="btn btn-o btn-sm" onClick={()=>setView("shop")}>
              <I d={ICONS.home} size={14}/> Shop
            </button>
            <button className="btn btn-d btn-sm" onClick={onLogout}>
              <I d={ICONS.x} size={14}/> Abmelden
            </button>
          </div>
        </div>

        {/* Newsletter */}
        <div style={{background:"var(--sf)",border:"1px solid var(--br)",borderRadius:"12px",padding:"1.2rem 1.4rem",marginBottom:"1.8rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:".95rem",display:"flex",alignItems:"center",gap:".4rem"}}>
              <I d={ICONS.newsletter} size={16}/> Newsletter
            </div>
            <div style={{fontSize:".78rem",color:"var(--mu)",marginTop:".2rem"}}>
              {newsletter ? "Sie erhalten unsere Angebote per E-Mail." : "Jetzt abonnieren und keine Angebote verpassen."}
            </div>
            {nlMsg && (
              <div style={{fontSize:".75rem",color:nlMsg.startsWith("Fehler")?"var(--err)":"var(--ok)",marginTop:".4rem",display:"flex",alignItems:"center",gap:".3rem"}}>
                <I d={nlMsg.startsWith("Fehler")?ICONS.x:ICONS.check} size={12}/>{nlMsg}
              </div>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:".75rem",flexShrink:0}}>
            <span style={{fontSize:".8rem",color:newsletter?"var(--ok)":"var(--mu)",fontWeight:600}}>
              {newsletter ? "✓ Abonniert" : "Nicht abonniert"}
            </span>
            <button className={`btn btn-sm${newsletter?" btn-d":" btn-p"}`}
              onClick={toggleNewsletter} disabled={nlSaving}
              style={{minWidth:"120px",justifyContent:"center"}}>
              {nlSaving?"Bitte warten…":newsletter?"Abmelden":"Jetzt abonnieren"}
            </button>
          </div>
        </div>

        {/* My Orders */}
        <h3 style={{fontFamily:"Barlow Condensed",fontWeight:800,fontSize:"1.3rem",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"1.2rem",display:"flex",alignItems:"center",gap:".5rem"}}>
          <I d={ICONS.orders} size={18}/> Meine Bestellungen
          <span style={{fontSize:".75rem",fontFamily:"Barlow",fontWeight:400,color:"var(--mu)",textTransform:"none",letterSpacing:0}}>({myOrders.length})</span>
        </h3>

        {myOrders.length === 0 ? (
          <div className="acc-empty">
            <I d={ICONS.box} size={48}/>
            <p style={{marginTop:"1rem",fontSize:".95rem"}}>Noch keine Bestellungen vorhanden.</p>
            <button className="btn btn-p" style={{marginTop:"1rem"}} onClick={()=>setView("shop")}>Jetzt einkaufen →</button>
          </div>
        ) : myOrders.map(o => {
          const isExpanded = expandedOrder === o.id;
          const subtotal = (o.items||[]).reduce((s,i)=>s+i.price*i.qty,0);
          const shippingCost = o.total - subtotal > 0.01 ? o.total - subtotal : (subtotal >= 50 ? 0 : 6);
          const serialMap = {};
          if (o.serial_numbers) o.serial_numbers.forEach(s=>{ if(s.serial) serialMap[s.id]=s.serial; });

          return (
            <div key={o.id} className="acc-order-card">
              {/* Order Header */}
              <div className="acc-order-hdr" style={{cursor:"pointer"}} onClick={()=>setExpandedOrder(isExpanded?null:o.id)}>
                <div>
                  <div className="acc-order-id">#{o.id}</div>
                  <div style={{fontSize:".75rem",color:"var(--mu)",marginTop:".1rem"}}>
                    {o.date} · {o.payment==="paypal"?"PayPal":"Vorkasse"}
                    {o.carrier && <span style={{marginLeft:".5rem"}}>· 📦 {o.carrier}</span>}
                  </div>
                </div>
                <div style={{textAlign:"right",display:"flex",alignItems:"center",gap:".75rem"}}>
                  <div>
                    <div className="acc-order-total">{fmt(o.total)}</div>
                    <span className={`spill ${statusClass[o.status]||"s-new"}`} style={{fontSize:".7rem"}}>{o.status}</span>
                  </div>
                  <div style={{color:"var(--mu)",transition:"transform .2s",transform:isExpanded?"rotate(90deg)":"rotate(0deg)"}}>
                    <I d={ICONS.chev} size={18}/>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              {o.status !== "Storniert" ? (
                <div className="acc-status-timeline">
                  {timelineSteps.map((step, idx) => {
                    const state = getStepState(step, o.status);
                    return (
                      <React.Fragment key={step}>
                        <div className="acc-tl-step">
                          <div className={`acc-tl-dot${state!=="none"?" "+state:""}`}>
                            {state==="done" && <I d={ICONS.check} size={11} sw={3}/>}
                            {state==="active" && <I d={ICONS.chev} size={11} sw={3}/>}
                          </div>
                          <div className={`acc-tl-label${state!=="none"?" "+state:""}`}>{step}</div>
                        </div>
                        {idx < timelineSteps.length-1 && <div className={`acc-tl-line${state==="done"?" done":""}`}/>}
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div style={{marginTop:".75rem",padding:".5rem .75rem",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:"7px",fontSize:".78rem",color:"var(--err)",display:"flex",alignItems:"center",gap:".4rem"}}>
                  <I d={ICONS.x} size={13}/> Diese Bestellung wurde storniert.
                </div>
              )}

              {/* EXPANDED DETAILS */}
              {isExpanded && (
                <div style={{marginTop:"1rem",borderTop:"1px solid var(--br)",paddingTop:"1rem"}}>

                  {/* Artikel + Seriennummern */}
                  <div style={{marginBottom:"1rem"}}>
                    <div style={{fontSize:".72rem",fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:".5rem"}}>
                      Bestellte Artikel
                    </div>
                    <div style={{background:"var(--sf2)",borderRadius:"8px",padding:".75rem"}}>
                      {(o.items||[]).map(i => {
                        const serial = serialMap[i.id];
                        return (
                          <div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:".3rem 0",borderBottom:"1px solid var(--br)"}}>
                            <div>
                              <div style={{fontSize:".85rem"}}>{i.name} <span style={{opacity:.6,fontSize:".8rem"}}>× {i.qty}</span></div>
                              {serial && (
                                <div style={{fontSize:".72rem",color:"var(--mu)",fontFamily:"monospace",marginTop:".1rem"}}>
                                  SN: {serial}
                                </div>
                              )}
                            </div>
                            <span style={{color:"var(--acc)",fontWeight:700,fontSize:".85rem",flexShrink:0,marginLeft:".5rem"}}>{fmt(i.price*i.qty)}</span>
                          </div>
                        );
                      })}
                      {/* Versandkosten */}
                      <div style={{display:"flex",justifyContent:"space-between",padding:".3rem 0",fontSize:".82rem"}}>
                        <span style={{color:"var(--mu)",display:"flex",alignItems:"center",gap:".3rem"}}>
                          <I d={ICONS.truck} size={12}/> Versandkosten
                        </span>
                        <span style={{color:shippingCost===0?"var(--ok)":"var(--tx)",fontWeight:600}}>
                          {shippingCost===0 ? "Kostenlos" : fmt(shippingCost)}
                        </span>
                      </div>
                      {/* Gesamt */}
                      <div style={{display:"flex",justifyContent:"space-between",padding:".5rem 0 0",borderTop:"1px solid var(--br)",marginTop:".2rem"}}>
                        <span style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:"1rem"}}>Gesamtbetrag</span>
                        <span style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:"1rem",color:"var(--acc)"}}>{fmt(o.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lieferadresse */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
                    <div>
                      <div style={{fontSize:".72rem",fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:".35rem"}}>Lieferadresse</div>
                      <div style={{fontSize:".83rem",lineHeight:1.7}}>
                        {o.customer?.name}<br/>
                        {o.customer?.street}<br/>
                        {o.customer?.zip} {o.customer?.city}
                      </div>
                    </div>
                    {/* Tracking */}
                    {(o.carrier || o.tracking_number) && (
                      <div>
                        <div style={{fontSize:".72rem",fontWeight:700,color:"var(--mu)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:".35rem"}}>Versand</div>
                        {o.carrier && <div style={{fontSize:".83rem",fontWeight:600}}>{o.carrier}</div>}
                        {o.tracking_number && (
                          <div style={{fontFamily:"monospace",fontSize:".8rem",color:"var(--inf)",marginTop:".2rem",wordBreak:"break-all"}}>
                            {o.tracking_number}
                          </div>
                        )}
                        {/* Tracking Link */}
                        {o.tracking_number && (o.carrier==="DHL"||o.carrier==="DHL Express") && (
                          <a href={`https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?idc=${o.tracking_number}`}
                            target="_blank" rel="noreferrer"
                            style={{fontSize:".75rem",color:"var(--inf)",marginTop:".35rem",display:"flex",alignItems:"center",gap:".25rem",textDecoration:"none"}}>
                            <I d={ICONS.link} size={11}/> Sendung verfolgen
                          </a>
                        )}
                        {o.tracking_number && o.carrier==="Hermes" && (
                          <a href={`https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${o.tracking_number}`}
                            target="_blank" rel="noreferrer"
                            style={{fontSize:".75rem",color:"var(--inf)",marginTop:".35rem",display:"flex",alignItems:"center",gap:".25rem",textDecoration:"none"}}>
                            <I d={ICONS.link} size={11}/> Sendung verfolgen
                          </a>
                        )}
                        {o.tracking_number && o.carrier==="UPS" && (
                          <a href={`https://www.ups.com/track?tracknum=${o.tracking_number}`}
                            target="_blank" rel="noreferrer"
                            style={{fontSize:".75rem",color:"var(--inf)",marginTop:".35rem",display:"flex",alignItems:"center",gap:".25rem",textDecoration:"none"}}>
                            <I d={ICONS.link} size={11}/> Sendung verfolgen
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vorkasse Bankdaten */}
                  {o.payment==="vorkasse" && o.status==="Neu" && (
                    <div style={{marginBottom:"1rem"}}>
                      <BankInfo orderId={o.id} total={o.total}/>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{display:"flex",gap:".6rem",flexWrap:"wrap",paddingTop:".5rem"}}>
                    <button className="btn btn-p btn-sm" onClick={()=>downloadInvoice(o)}
                      style={{display:"flex",alignItems:"center",gap:".4rem"}}>
                      <I d={ICONS.invoice} size={14}/> Rechnung herunterladen / drucken
                    </button>
                    <button className="btn btn-o btn-sm" onClick={()=>setExpandedOrder(null)}>
                      Schließen
                    </button>
                  </div>
                </div>
              )}

              {/* Quick summary wenn nicht expanded */}
              {!isExpanded && (
                <div className="acc-order-items" style={{marginTop:".5rem"}}>
                  {(o.items||[]).slice(0,2).map(i=>(
                    <div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:".15rem 0",fontSize:".8rem"}}>
                      <span style={{color:"var(--mu)"}}>{i.name.split(" ").slice(0,4).join(" ")} × {i.qty}</span>
                      <span style={{color:"var(--acc)"}}>{fmt(i.price*i.qty)}</span>
                    </div>
                  ))}
                  {(o.items||[]).length > 2 && (
                    <div style={{fontSize:".75rem",color:"var(--mu)",marginTop:".15rem"}}>
                      + {o.items.length-2} weitere Artikel — <span style={{color:"var(--acc)",cursor:"pointer"}} onClick={()=>setExpandedOrder(o.id)}>Details anzeigen →</span>
                    </div>
                  )}
                  {(o.items||[]).length <= 2 && (
                    <div style={{fontSize:".72rem",color:"var(--mu)",marginTop:".35rem",cursor:"pointer",color:"var(--acc)"}} onClick={()=>setExpandedOrder(o.id)}>
                      Details & Rechnung anzeigen →
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NEWSLETTER SECTION ────────────────────────────────────────────────────────
function NewsletterSection({ newsletterList, deleteCustomer }) {
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [localList, setLocalList] = useState(newsletterList);

  // Sync when parent list changes
  useEffect(() => { setLocalList(newsletterList); }, [newsletterList]);

  const filtered = localList.filter(c =>
    !search ||
    (c.name||"").toLowerCase().includes(search.toLowerCase()) ||
    (c.email||"").toLowerCase().includes(search.toLowerCase())
  );

  const fmtDt = (iso) => {
    if (!iso) return "–";
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE") + " " + d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  };

  const handleUnsubscribe = async (c) => {
    if (!window.confirm(`Newsletter-Abonnement von ${c.email} wirklich entfernen?`)) return;
    try {
      if (c.source === "bestellung") {
        // Update all orders for this email
        await supabase.from("orders").update({ newsletter: false }).eq("customer_email", c.email);
      } else {
        // Update user_metadata in auth — remove newsletter flag
        // We can do this via a custom RPC or just mark it in orders
        // For now: remove from local list and show note
      }
      setLocalList(l => l.filter(x => x.email !== c.email));
    } catch(e) {
      alert("Fehler beim Abmelden: " + e.message);
    }
  };

  // Export as CSV
  const exportCSV = () => {
    const rows = [
      ["Name","E-Mail","Abonniert am","Quelle"],
      ...localList.map(c=>[c.name||"–", c.email, fmtDt(c.subscribed_at), c.source==="registrierung"?"Registrierung":"Bestellung"])
    ];
    const csv = rows.map(r=>r.map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `newsletter-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="be-hdr">
        <div className="be-ttl">Newsletter</div>
        <div style={{display:"flex",gap:".6rem",alignItems:"center"}}>
          <span style={{fontSize:".82rem",color:"var(--mu)"}}>{localList.length} Abonnent{localList.length!==1?"en":""}</span>
          <button className="btn btn-o btn-sm" onClick={exportCSV}>
            <I d={ICONS.upload} size={13}/> CSV Export
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{marginBottom:"1.2rem"}}>
        <div className="sw" style={{maxWidth:"320px"}}>
          <I d={ICONS.search} size={15}/>
          <input className="si" placeholder="Name oder E-Mail suchen…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"4rem",color:"var(--mu)"}}>
          <I d={ICONS.newsletter} size={40}/>
          <p style={{marginTop:"1rem"}}>{search ? "Keine Treffer." : "Noch keine Newsletter-Abonnenten."}</p>
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>E-Mail</th>
                <th>Abonniert am</th>
                <th>Quelle</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={c.email}>
                  <td style={{color:"var(--mu)",fontSize:".78rem"}}>{idx+1}</td>
                  <td style={{fontWeight:600}}>{c.name||"–"}</td>
                  <td>
                    <a href={`mailto:${c.email}`} style={{color:"var(--acc)",fontSize:".82rem"}}>{c.email}</a>
                  </td>
                  <td style={{fontSize:".78rem",color:"var(--mu)",whiteSpace:"nowrap"}}>{fmtDt(c.subscribed_at)}</td>
                  <td>
                    <span style={{fontSize:".72rem",padding:".15rem .5rem",borderRadius:"99px",
                      background: c.source==="registrierung" ? "rgba(59,130,246,.12)" : "rgba(232,160,32,.12)",
                      color: c.source==="registrierung" ? "var(--inf)" : "var(--acc)",
                      border: c.source==="registrierung" ? "1px solid rgba(59,130,246,.25)" : "1px solid rgba(232,160,32,.25)",
                    }}>
                      {c.source==="registrierung" ? "🔐 Registrierung" : "🛒 Bestellung"}
                    </span>
                  </td>
                  <td><span className="nl-badge"><I d={ICONS.check} size={10}/> Aktiv</span></td>
                  <td>
                    <div className="acts">
                      <a className="btn btn-o btn-sm" href={`mailto:${c.email}`}>
                        <I d={ICONS.mail} size={12}/> Mail
                      </a>
                      <button className="btn btn-sm" style={{background:"rgba(249,115,22,.12)",color:"#f97316",border:"1px solid rgba(249,115,22,.25)"}}
                        onClick={()=>handleUnsubscribe(c)}>
                        <I d={ICONS.x} size={12}/> Abmelden
                      </button>
                      <button className="btn btn-d btn-sm" onClick={()=>setConfirmDel(c)}>
                        <I d={ICONS.trash} size={12}/> Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDel && (
        <div className="mkov" onClick={()=>setConfirmDel(null)}>
          <div className="mkbox" style={{maxWidth:"420px"}} onClick={e=>e.stopPropagation()}>
            <h2 style={{color:"var(--err)"}}>Kunden löschen</h2>
            <div className="del-confirm-box">
              <p style={{fontSize:".85rem",marginBottom:".6rem"}}>
                Möchten Sie den Kunden <strong style={{color:"var(--tx)"}}>{confirmDel.name||confirmDel.email}</strong> wirklich vollständig löschen?
              </p>
              <p style={{fontSize:".78rem",color:"var(--mu)"}}>
                ⚠️ Alle Bestelldaten werden unwiderruflich gelöscht.
              </p>
            </div>
            <div className="mk-acts">
              <button className="btn btn-o" onClick={()=>setConfirmDel(null)}>Abbrechen</button>
              <button className="btn btn-d" disabled={deleting} onClick={async()=>{
                setDeleting(true);
                await deleteCustomer(confirmDel.email);
                setLocalList(l=>l.filter(x=>x.email!==confirmDel.email));
                setConfirmDel(null); setDeleting(false);
              }}>
                <I d={ICONS.trash} size={15}/> {deleting?"Lösche…":"Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── CUSTOMERS SECTION ─────────────────────────────────────────────────────────
function CustomersSection({ orders, regUsers, regLoading, setOrderModal, setInvoiceModal, deleteCustomer, deleteUserById }) {
  const [tab, setTab] = useState("registered"); // registered | buyers
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("datum");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const statusClass = { "Neu":"s-new","Bezahlt":"s-paid","Versendet":"s-ship","Storniert":"s-canc" };

  // ── REGISTERED USERS (from Supabase auth) ──────────────────────────────────
  const filteredUsers = regUsers.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.full_name||"").toLowerCase().includes(q) ||
           (u.email||"").toLowerCase().includes(q) ||
           (u.city||"").toLowerCase().includes(q);
  });

  // Format date
  const fmtDt = (iso) => {
    if (!iso) return "–";
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE") + " " + d.toLocaleTimeString("de-DE", {hour:"2-digit",minute:"2-digit"});
  };

  // Get orders for a user email
  const ordersFor = (email) => orders.filter(o => o.customer?.email?.toLowerCase() === (email||"").toLowerCase());

  // ── BUYERS (from orders, deduplicated) ────────────────────────────────────
  const customerMap = {};
  orders.forEach(o => {
    const email = o.customer?.email;
    if (!email) return;
    if (!customerMap[email]) {
      customerMap[email] = { email, name: o.customer?.name||"–", street:o.customer?.street||"", zip:o.customer?.zip||"", city:o.customer?.city||"", orders:[], firstOrder:o.date };
    }
    customerMap[email].orders.push(o);
  });
  let buyers = Object.values(customerMap).map(c => ({
    ...c,
    totalRevenue: c.orders.reduce((s,o)=>s+o.total,0),
    orderCount: c.orders.length,
    avgOrder: c.orders.reduce((s,o)=>s+o.total,0)/c.orders.length,
    initials: (c.name.split(" ").map(w=>w[0]).join("").toUpperCase()).slice(0,2),
  }));
  if (search) {
    const q = search.toLowerCase();
    buyers = buyers.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.city.toLowerCase().includes(q));
  }
  buyers.sort((a,b)=>{
    if(sortBy==="umsatz") return b.totalRevenue-a.totalRevenue;
    if(sortBy==="bestellungen") return b.orderCount-a.orderCount;
    if(sortBy==="name") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <>
      <div className="be-hdr">
        <div className="be-ttl">Kunden</div>
        <div style={{fontSize:".82rem",color:"var(--mu)"}}>
          {regUsers.length} registriert · {Object.keys(customerMap).length} Käufer
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:".3rem",marginBottom:"1.2rem",background:"var(--sf2)",borderRadius:"8px",padding:".2rem",width:"fit-content"}}>
        {[
          ["registered", `Registrierte Benutzer (${regUsers.length})`, ICONS.user],
          ["buyers", `Käufer (${Object.keys(customerMap).length})`, ICONS.orders],
        ].map(([k,l,d])=>(
          <button key={k}
            style={{padding:".45rem 1rem",borderRadius:"6px",fontWeight:600,fontSize:".83rem",cursor:"pointer",border:"none",
              background:tab===k?"var(--sf)":"none",color:tab===k?"var(--tx)":"var(--mu)",
              boxShadow:tab===k?"0 1px 4px rgba(0,0,0,.3)":"none",display:"flex",alignItems:"center",gap:".4rem",transition:"all .18s"}}
            onClick={()=>setTab(k)}>
            <I d={d} size={14}/>{l}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{marginBottom:"1.1rem",display:"flex",gap:".75rem",flexWrap:"wrap",alignItems:"center"}}>
        <div className="sw" style={{maxWidth:"300px"}}>
          <I d={ICONS.search} size={15}/>
          <input className="si" placeholder="Name, E-Mail, Stadt …" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        {tab==="buyers" && (
          <div className="cust-filter-btns">
            {[["umsatz","Umsatz"],["bestellungen","Bestellungen"],["name","Name"]].map(([k,l])=>(
              <button key={k} className={`chip${sortBy===k?" on":""}`} onClick={()=>setSortBy(k)}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB: REGISTERED USERS ── */}
      {tab === "registered" && (
        regLoading ? (
          <div style={{textAlign:"center",padding:"3rem",color:"var(--mu)"}}>Lade Benutzer…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="acc-empty"><I d={ICONS.users} size={40}/><p style={{marginTop:"1rem"}}>Keine registrierten Benutzer gefunden.</p></div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Telefon</th>
                  <th>Adresse</th>
                  <th>Registriert am</th>
                  <th>Letzter Login</th>
                  <th>E-Mail bestätigt</th>
                  <th>Bestellungen</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const userOrders = ordersFor(u.email);
                  const totalRev = userOrders.reduce((s,o)=>s+o.total,0);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                          <div style={{width:"30px",height:"30px",borderRadius:"50%",background:"linear-gradient(135deg,var(--acc),#e03010)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".68rem",fontWeight:900,color:"#000",flexShrink:0}}>
                            {(u.full_name||u.email||"?").slice(0,1).toUpperCase()}
                          </div>
                          <span style={{fontWeight:600,fontSize:".85rem"}}>{u.full_name||"–"}</span>
                        </div>
                      </td>
                      <td>
                        <a href={`mailto:${u.email}`} style={{color:"var(--acc)",fontSize:".82rem"}}>{u.email}</a>
                      </td>
                      <td style={{color:"var(--mu)",fontSize:".8rem"}}>{u.phone||"–"}</td>
                      <td style={{fontSize:".78rem",color:"var(--mu)"}}>
                        {u.street ? <>{u.street}<br/>{u.zip} {u.city}</> : "–"}
                      </td>
                      <td style={{fontSize:".75rem",color:"var(--mu)",whiteSpace:"nowrap"}}>{fmtDt(u.created_at)}</td>
                      <td style={{fontSize:".75rem",color:"var(--mu)",whiteSpace:"nowrap"}}>{fmtDt(u.last_sign_in_at)}</td>
                      <td>
                        {u.email_confirmed_at
                          ? <span style={{color:"var(--ok)",fontSize:".72rem",display:"flex",alignItems:"center",gap:".2rem"}}><I d={ICONS.check} size={11}/> Ja</span>
                          : <span style={{color:"var(--err)",fontSize:".72rem"}}>Nein</span>
                        }
                      </td>
                      <td>
                        {userOrders.length > 0 ? (
                          <div style={{fontSize:".78rem"}}>
                            <div style={{fontWeight:700,color:"var(--acc)"}}>{fmt(totalRev)}</div>
                            <div style={{color:"var(--mu)"}}>{userOrders.length} Bestellung{userOrders.length!==1?"en":""}</div>
                          </div>
                        ) : <span style={{color:"var(--mu)",fontSize:".75rem"}}>Keine</span>}
                      </td>
                      <td>
                        <div className="acts">
                          <a className="btn btn-o btn-sm" href={`mailto:${u.email}`}><I d={ICONS.mail} size={12}/></a>
                          <button className="btn btn-d btn-sm"
                            onClick={()=>setConfirmDel({id:u.id, email:u.email, name:u.full_name||u.email, orderCount:userOrders.length, isUser:true})}>
                            <I d={ICONS.trash} size={12}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── TAB: BUYERS ── */}
      {tab === "buyers" && (
        buyers.length === 0 ? (
          <div className="acc-empty"><I d={ICONS.box} size={40}/><p style={{marginTop:"1rem"}}>Keine Käufer gefunden.</p></div>
        ) : (
          <div className="cust-grid">
            {buyers.map(c => (
              <div key={c.email} className="cust-card" onClick={()=>setSelectedCustomer(c)}>
                <div className="cust-card-hdr">
                  <div className="cust-avatar">{c.initials}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="cust-name">{c.name}</div>
                    <div className="cust-email">{c.email}</div>
                    {c.city && <div style={{fontSize:".72rem",color:"var(--mu)",marginTop:".1rem"}}>📍 {c.zip} {c.city}</div>}
                  </div>
                </div>
                <div className="cust-stats">
                  <div className="cust-stat"><div className="cust-stat-val">{c.orderCount}</div><div className="cust-stat-lbl">Bestellungen</div></div>
                  <div className="cust-stat"><div className="cust-stat-val">{fmt(c.totalRevenue)}</div><div className="cust-stat-lbl">Umsatz</div></div>
                  <div className="cust-stat"><div className="cust-stat-val">{fmt(c.avgOrder)}</div><div className="cust-stat-lbl">Ø Bestellung</div></div>
                </div>
                <div style={{marginTop:".65rem",display:"flex",gap:".35rem",flexWrap:"wrap"}}>
                  {c.orders.slice(0,3).map(o=>(
                    <span key={o.id} className={`spill ${statusClass[o.status]||"s-new"}`} style={{fontSize:".65rem"}}>{o.status}</span>
                  ))}
                  {c.orders.length>3 && <span style={{fontSize:".65rem",color:"var(--mu)"}}>+{c.orders.length-3}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Buyer Detail Modal */}
      {selectedCustomer && (
        <div className="mkov cust-detail-modal" onClick={e=>e.target===e.currentTarget&&setSelectedCustomer(null)}>
          <div className="mkbox">
            <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem"}}>
              <div className="cust-avatar" style={{width:"52px",height:"52px",fontSize:"1.3rem"}}>{selectedCustomer.initials}</div>
              <div style={{flex:1}}>
                <h2 style={{margin:0,fontSize:"1.5rem"}}>{selectedCustomer.name}</h2>
                <div style={{color:"var(--mu)",fontSize:".85rem"}}>{selectedCustomer.email}</div>
                {selectedCustomer.street && <div style={{fontSize:".78rem",color:"var(--mu)",marginTop:".15rem"}}>{selectedCustomer.street} · {selectedCustomer.zip} {selectedCustomer.city}</div>}
              </div>
              <button className="xbtn" onClick={()=>setSelectedCustomer(null)}><I d={ICONS.x} size={14}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".75rem",marginBottom:"1.5rem"}}>
              {[["Bestellungen",selectedCustomer.orderCount],["Gesamtumsatz",fmt(selectedCustomer.totalRevenue)],["Ø Bestellwert",fmt(selectedCustomer.avgOrder)]].map(([l,v])=>(
                <div key={l} className="sc" style={{padding:".85rem"}}>
                  <div className="sc-lbl">{l}</div>
                  <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:"1.1rem",color:"var(--acc)",marginTop:".2rem"}}>{v}</div>
                </div>
              ))}
            </div>
            <h3 style={{fontFamily:"Barlow Condensed",fontWeight:800,fontSize:"1rem",textTransform:"uppercase",color:"var(--mu)",letterSpacing:"1px",marginBottom:".85rem"}}>
              Bestellhistorie
            </h3>
            <div style={{maxHeight:"320px",overflowY:"auto"}}>
              {selectedCustomer.orders.sort((a,b)=>b.id.localeCompare(a.id)).map(o=>(
                <div key={o.id} className="cust-history-item" onClick={()=>{setOrderModal(o);setSelectedCustomer(null);}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:".78rem",color:"var(--acc)"}}>{o.id}</div>
                    <div style={{fontSize:".78rem",color:"var(--mu)",marginTop:".1rem"}}>{o.date} · {o.payment==="paypal"?"PayPal":"Vorkasse"}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,color:"var(--acc)"}}>{fmt(o.total)}</div>
                    <span className={`spill ${statusClass[o.status]||"s-new"}`} style={{fontSize:".68rem"}}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mk-acts">
              <button className="btn btn-o" onClick={()=>setSelectedCustomer(null)}>Schließen</button>
              <button className="btn btn-d" onClick={()=>{setConfirmDel({email:selectedCustomer.email,name:selectedCustomer.name,orderCount:selectedCustomer.orderCount,isUser:false});setSelectedCustomer(null);}}>
                <I d={ICONS.trash} size={15}/> Bestelldaten löschen
              </button>
              <a className="btn btn-i" href={`mailto:${selectedCustomer.email}`}><I d={ICONS.mail} size={15}/> E-Mail</a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDel && (
        <div className="mkov" onClick={()=>setConfirmDel(null)}>
          <div className="mkbox" style={{maxWidth:"420px"}} onClick={e=>e.stopPropagation()}>
            <h2 style={{color:"var(--err)"}}>Kunden löschen</h2>
            <div className="del-confirm-box">
              <p style={{fontSize:".85rem",marginBottom:".6rem"}}>
                <strong style={{color:"var(--tx)"}}>{confirmDel.name}</strong> ({confirmDel.email}) wirklich löschen?
              </p>
              <p style={{fontSize:".78rem",color:"var(--mu)"}}>
                ⚠️ {confirmDel.isUser
                  ? "Das Benutzerkonto und alle Bestelldaten werden gelöscht."
                  : `${confirmDel.orderCount} Bestellung${confirmDel.orderCount!==1?"en":""} werden unwiderruflich gelöscht.`}
              </p>
            </div>
            <div className="mk-acts">
              <button className="btn btn-o" onClick={()=>setConfirmDel(null)}>Abbrechen</button>
              <button className="btn btn-d" disabled={deleting} onClick={async()=>{
                setDeleting(true);
                if (confirmDel.isUser) await deleteUserById(confirmDel.id, confirmDel.email);
                else await deleteCustomer(confirmDel.email);
                setConfirmDel(null); setDeleting(false);
              }}>
                <I d={ICONS.trash} size={15}/> {deleting?"Lösche…":"Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("shop"); // shop | backend | contact | impressum | agb | datenschutz | login | account
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const [beSection, setBeSection] = useState("dashboard");
  const [productModal, setProductModal] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [beAuth, setBeAuth] = useState(false);
  const [bePassword, setBePassword] = useState("");
  const [beAuthError, setBeAuthError] = useState(false);
  const BE_PASSWORD = "MKE2026!";
  // Customer Auth
  const [custUser, setCustUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [dbError, setDbError] = useState(null);

  // Check existing Supabase auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setCustUser(session.user);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setCustUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: prods, error: pe }, { data: ords, error: oe }] = await Promise.all([
          supabase.from("products").select("*").order("id", { ascending: true }),
          supabase.from("orders").select("*").order("created_at", { ascending: false }),
        ]);
        if (pe) throw pe;
        if (oe) throw oe;

        if (!prods || prods.length === 0) {
          // DB komplett leer → alle Produkte einspielen
          const rows = DEFAULT_PRODUCTS.map(p => ({
            name:p.name, category:p.category, price:p.price, ek:p.ek,
            shipping:p.shipping, stock:p.stock, stock_external:p.stockExternal,
            delivery:p.delivery, sku:p.sku, images:p.images, description:p.description,
            supplier:p.supplier||"",
          }));
          const { data: seeded } = await supabase.from("products").insert(rows).select();
          setProducts((seeded||[]).map(rowToProduct));
        } else {
          // DB hat Produkte → prüfe ob neue DEFAULT_PRODUCTS fehlen (per SKU)
          const existingSkus = new Set(prods.map(p => p.sku).filter(Boolean));
          const existingNames = new Set(prods.map(p => p.name));
          const missing = DEFAULT_PRODUCTS.filter(p =>
            p.sku ? !existingSkus.has(p.sku) : !existingNames.has(p.name)
          );
          if (missing.length > 0) {
            const rows = missing.map(p => ({
              name:p.name, category:p.category, price:p.price, ek:p.ek,
              shipping:p.shipping, stock:p.stock, stock_external:p.stockExternal,
              delivery:p.delivery, sku:p.sku, images:p.images, description:p.description,
              supplier:p.supplier||"",
            }));
            const { data: added } = await supabase.from("products").insert(rows).select();
            const allProds = [...prods, ...(added||[])];
            setProducts(allProds.map(rowToProduct));
            console.log(`✅ ${missing.length} neue Produkte in Supabase eingespielt`);
          } else {
            setProducts(prods.map(rowToProduct));
          }
        }
        setOrders((ords||[]).map(rowToOrder));
        setLoaded(true);
      } catch(e) {
        console.error("DB Fehler:", e);
        setDbError("Datenbankverbindung fehlgeschlagen. Lokale Daten werden verwendet.");
        setProducts(DEFAULT_PRODUCTS);
        setOrders([]);
        setLoaded(true);
      }
    })();
  }, []);

  const categories = ["Alle", ...Array.from(new Set(products.map(p=>p.category)))];
  const filtered = products.filter(p => {
    const inCat = category==="Alle" || p.category===category;
    const q = search.toLowerCase();
    const inSearch = !q || p.name.toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q) || (p.sku||"").toLowerCase().includes(q);
    return inCat && inSearch;
  });

  const addToCart = (product) => {
    setCart(c => {
      const ex = c.find(i=>i.id===product.id);
      if(ex) return c.map(i=>i.id===product.id?{...i,qty:Math.min(i.qty+1,product.stock)}:i);
      return [...c, {...product, qty:1}];
    });
    setCartOpen(true);
  };
  const updateQty = (id,delta) => setCart(c=>c.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+delta)}:i).filter(i=>i.qty>0));
  const removeFromCart = (id) => setCart(c=>c.filter(i=>i.id!==id));
  const cartSubtotal = cart.reduce((s,i)=>s+i.price*i.qty, 0);
  const SHIPPING_FREE_THRESHOLD = 50;
  const SHIPPING_COST = 6;
  const shippingCost = cartSubtotal >= SHIPPING_FREE_THRESHOLD ? 0 : (cart.length > 0 ? SHIPPING_COST : 0);
  const cartTotal = cartSubtotal + shippingCost;
  const cartCount = cart.reduce((s,i)=>s+i.qty, 0);

  const placeOrder = async (data) => {
    const order = {
      id: genId(), date: fmtDate(),
      status: data.payment === "paypal" ? "Bezahlt" : "Neu",
      payment: data.payment, customer: data.customer,
      items: cart, total: cartTotal,
      paypalOrderId: data.paypalOrderId || null,
      newsletter: data.newsletter || false,
    };
    try {
      await supabase.from("orders").insert(orderToRow(order));
    } catch(e) { console.error("Bestellung speichern fehlgeschlagen:", e); }
    setOrders(o => [order, ...o]);
    setCart([]); setCheckoutOpen(false); setOrderSuccess(order); setCartOpen(false);
    sendOrderNotification(order);
  };

  const saveProduct = async (prod) => {
    try {
      if (prod.id) {
        // Update existing
        const { data } = await supabase.from("products").update(productToRow(prod)).eq("id", prod.id).select().single();
        if (data) setProducts(ps => ps.map(p => p.id === prod.id ? rowToProduct(data) : p));
      } else {
        // Insert new
        const row = productToRow(prod);
        delete row.id;
        const { data } = await supabase.from("products").insert(row).select().single();
        if (data) setProducts(ps => [rowToProduct(data), ...ps]);
      }
    } catch(e) {
      console.error("Produkt speichern fehlgeschlagen:", e);
      if (prod.id) setProducts(ps => ps.map(p => p.id === prod.id ? prod : p));
      else setProducts(ps => [{ ...prod, id: Date.now() }, ...ps]);
    }
    setProductModal(null);
  };

  const deleteProduct = async (id) => {
    try {
      await supabase.from("products").delete().eq("id", id);
    } catch(e) { console.error("Produkt löschen fehlgeschlagen:", e); }
    setProducts(ps => ps.filter(p => p.id !== id));
  };

  const updateOrderStatus = async (id, status) => {
    try {
      await supabase.from("orders").update({ status }).eq("id", id);
    } catch(e) { console.error("Status Update fehlgeschlagen:", e); }
    setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
  };

  const updateOrderDetails = async (id, fields) => {
    // fields: { status, serial_numbers, carrier, tracking_number }
    try {
      await supabase.from("orders").update(fields).eq("id", id);
    } catch(e) { console.error("Bestellung Update fehlgeschlagen:", e); }
    setOrders(os => os.map(o => o.id === id ? { ...o, ...fields } : o));
  };

  // Delete all orders for a customer by email (DSGVO compliant)
  const deleteCustomer = async (email) => {
    try {
      await supabase.from("orders").delete().eq("customer_email", email);
    } catch(e) { console.error("Kunden löschen fehlgeschlagen:", e); }
    setOrders(os => os.filter(o => o.customer?.email !== email));
  };

  const handleBeLogin = () => {
    if (bePassword === BE_PASSWORD) {
      setBeAuth(true); setBeAuthError(false); setBePassword("");
      setView("backend");
    } else {
      setBeAuthError(true); setBePassword("");
    }
  };
  const handleBeLogout = () => { setBeAuth(false); setView("shop"); };

  const handleCustLogin = (user) => { setCustUser(user); setView("account"); };
  const handleCustLogout = async () => {
    await supabase.auth.signOut();
    setCustUser(null); setView("shop");
  };

  if(!loaded) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"var(--mu)",fontFamily:"Barlow,sans-serif"}}>Lädt…</div>;

  const newOrderCount = orders.filter(o=>o.status==="Neu").length;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <nav className="nav">
          <span className="logo" style={{cursor:"pointer"}} onClick={()=>setView("shop")} onDoubleClick={()=>setView("backend")}>MK<em>·</em>ELECTRO <small>mk-electro.com</small></span>
          <div className="nav-links">
            <button className={`nb${view==="shop"?" on":""}`} onClick={()=>setView("shop")}><I d={ICONS.home} size={15}/> Shop</button>
            <button className={`nb${view==="contact"?" on":""}`} onClick={()=>setView("contact")}><I d={ICONS.mail} size={15}/> Kontakt</button>

            {/* Customer Account Button */}
            {custUser ? (
              <button className={`nb${view==="account"?" on":""}`} onClick={()=>setView("account")} style={{display:"flex",alignItems:"center",gap:".38rem"}}>
                <div style={{width:"20px",height:"20px",borderRadius:"50%",background:"var(--acc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".6rem",fontWeight:900,color:"#000",flexShrink:0}}>
                  {(custUser.user_metadata?.full_name||custUser.email||"K").slice(0,1).toUpperCase()}
                </div>
                Mein Konto
              </button>
            ) : (
              <button className={`nb${view==="login"?" on":""}`} onClick={()=>setView("login")}>
                <I d={ICONS.user} size={15}/> Anmelden
              </button>
            )}

            {beAuth && (
              <button className={`nb${view==="backend"?" on":""}`} onClick={()=>setView("backend")} style={{position:"relative"}}>
                <I d={ICONS.shield} size={15}/> Backend
                {newOrderCount>0 && <span className="badge" style={{position:"absolute",top:".1rem",right:".1rem",fontSize:".55rem",padding:".05rem .28rem"}}>{newOrderCount}</span>}
              </button>
            )}
            {beAuth && (
              <button className="nb" onClick={handleBeLogout} style={{color:"var(--err)"}}>
                <I d={ICONS.x} size={15}/> Logout
              </button>
            )}
          </div>
          {(view==="shop"||view==="contact"||view==="impressum"||view==="agb"||view==="datenschutz"||view==="login"||view==="account") && (
            <button className="cart-btn" onClick={()=>setCartOpen(true)}>
              <I d={ICONS.cart} size={15}/> Warenkorb {cartCount>0 && <span className="badge">{cartCount}</span>}
            </button>
          )}
        </nav>
        {dbError && (
          <div style={{background:"rgba(239,68,68,.12)",borderBottom:"1px solid rgba(239,68,68,.3)",padding:".6rem 1.8rem",fontSize:".8rem",color:"var(--err)",display:"flex",alignItems:"center",gap:".6rem"}}>
            <I d={ICONS.x} size={14}/> {dbError}
          </div>
        )}

        {view==="shop" && (
          <ShopView
            products={filtered} categories={categories} category={category} search={search}
            setCategory={setCategory} setSearch={setSearch} addToCart={addToCart}
            setView={setView}
          />
        )}
        {view==="contact"    && <ContactPage    setView={setView}/>}
        {view==="impressum"  && <ImpressumPage  />}
        {view==="agb"        && <AGBPage        setView={setView}/>}
        {view==="datenschutz"&& <DatenschutzPage/>}
        {view==="login"      && <CustomerAuthPage onLogin={handleCustLogin} setView={setView}/>}
        {view==="account"    && <CustomerAccountPage user={custUser} orders={orders} onLogout={handleCustLogout} setView={setView}/>}
        {view==="backend" && !beAuth && (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:"2rem"}}>
            <div style={{background:"var(--sf)",border:"1px solid var(--br)",borderRadius:"16px",padding:"2.5rem",width:"min(400px,100%)",textAlign:"center"}}>
              <div style={{width:"56px",height:"56px",background:"rgba(232,160,32,.12)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1.5rem",color:"var(--acc)"}}>
                <I d={ICONS.shield} size={26}/>
              </div>
              <h2 style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:"1.7rem",marginBottom:".5rem"}}>Backend Login</h2>
              <p style={{color:"var(--mu)",fontSize:".85rem",marginBottom:"1.8rem"}}>Geschützter Bereich — nur für Administratoren</p>
              <input
                className="fi"
                type="password"
                placeholder="Passwort eingeben"
                value={bePassword}
                onChange={e=>{setBePassword(e.target.value);setBeAuthError(false);}}
                onKeyDown={e=>e.key==="Enter"&&handleBeLogin()}
                style={{marginBottom:beAuthError?".5rem":"1rem",borderColor:beAuthError?"var(--err)":"",textAlign:"center",fontSize:"1rem",letterSpacing:"2px"}}
                autoFocus
              />
              {beAuthError && (
                <div style={{color:"var(--err)",fontSize:".8rem",marginBottom:"1rem",display:"flex",alignItems:"center",justifyContent:"center",gap:".4rem"}}>
                  <I d={ICONS.x} size={14}/> Falsches Passwort
                </div>
              )}
              <button className="btn btn-p" style={{width:"100%",justifyContent:"center",fontSize:"1rem"}} onClick={handleBeLogin}>
                <I d={ICONS.shield} size={16}/> Einloggen
              </button>
              <button className="nb" style={{marginTop:"1rem",width:"100%",justifyContent:"center",fontSize:".83rem"}} onClick={()=>setView("shop")}>
                Zurück zum Shop
              </button>
            </div>
          </div>
        )}
        {view==="backend" && beAuth && (
          <BackendView
            products={products} orders={orders} beSection={beSection} setBeSection={setBeSection}
            productModal={productModal} setProductModal={setProductModal}
            orderModal={orderModal} setOrderModal={setOrderModal}
            invoiceModal={invoiceModal} setInvoiceModal={setInvoiceModal}
            saveProduct={saveProduct} deleteProduct={deleteProduct}
            updateOrderStatus={updateOrderStatus} updateOrderDetails={updateOrderDetails} deleteCustomer={deleteCustomer}
          />
        )}

        {/* Global cart sidebar — available on all non-backend pages */}
        {view!=="backend" && cartOpen && (
          <>
            <div className="ov" onClick={()=>setCartOpen(false)}/>
            <div className="cart-sb">
              <div className="sb-hdr">
                <h2>Warenkorb ({cartCount})</h2>
                <div className="xbtn" onClick={()=>setCartOpen(false)}><I d={ICONS.x} size={14}/></div>
              </div>
              <div className="cart-items">
                {cart.length===0 ? (
                  <div style={{textAlign:"center",padding:"3rem 1rem",color:"var(--mu)"}}>
                    <I d={ICONS.cart} size={36}/><p style={{marginTop:"1rem"}}>Ihr Warenkorb ist leer.</p>
                  </div>
                ) : cart.map(item=>{
                  const img = (item.images||[item.image].filter(Boolean))[0] || "";
                  return (
                    <div key={item.id} className="citem">
                      <img src={img} alt={item.name} onError={e=>e.target.src="https://placehold.co/56x56/161b23/6e7d96?text=?"}/>
                      <div className="cinfo">
                        <div className="cname">{item.name}</div>
                        <div className="cprice">{fmt(item.price*item.qty)}</div>
                        <div className="qc">
                          <div className="qb" onClick={()=>removeFromCart(item.id)}><I d={ICONS.trash} size={10}/></div>
                          <div className="qb" onClick={()=>updateQty(item.id,-1)}><I d={ICONS.minus} size={10}/></div>
                          <span className="qn">{item.qty}</span>
                          <div className="qb" onClick={()=>updateQty(item.id,1)}><I d={ICONS.plus} size={10}/></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {cart.length>0 && (
                <div className="cart-ft">
                  {/* Shipping info */}
                  {shippingCost > 0 ? (
                    <div style={{fontSize:".78rem",color:"var(--mu)",marginBottom:".5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>Versandkosten</span>
                      <span style={{color:"var(--tx)",fontWeight:600}}>{fmt(shippingCost)}</span>
                    </div>
                  ) : (
                    <div style={{fontSize:".75rem",color:"var(--ok)",marginBottom:".5rem",display:"flex",alignItems:"center",gap:".3rem"}}>
                      <I d={ICONS.check} size={12}/> Kostenloser Versand
                    </div>
                  )}
                  {shippingCost > 0 && (
                    <div style={{fontSize:".72rem",color:"var(--mu)",marginBottom:".6rem",background:"rgba(232,160,32,.08)",border:"1px solid rgba(232,160,32,.15)",borderRadius:"6px",padding:".35rem .6rem"}}>
                      Noch <strong style={{color:"var(--acc)"}}>{fmt(SHIPPING_FREE_THRESHOLD - cartSubtotal)}</strong> bis zum kostenlosen Versand
                    </div>
                  )}
                  <div className="ctotal"><span>Gesamt inkl. MwSt.</span><span>{fmt(cartTotal)}</span></div>
                  <button className="btn btn-p" style={{width:"100%"}} onClick={()=>{setCartOpen(false);setCheckoutOpen(true);}}>Zur Kasse →</button>
                </div>
              )}
            </div>
          </>
        )}
        {view!=="backend" && checkoutOpen && <Checkout cart={cart} cartTotal={cartTotal} cartSubtotal={cartSubtotal} shippingCost={shippingCost} onClose={()=>setCheckoutOpen(false)} onOrder={placeOrder} custUser={custUser}/>}
        {view!=="backend" && orderSuccess && (
          <>
            <div className="ov" onClick={()=>setOrderSuccess(null)}/>
            <div className="chk-ov">
              <div className="chk-box" style={{maxWidth:520}}>
                <div className="succ-scr">
                  <div className="succ-ic"><I d={ICONS.check} size={26}/></div>
                  <h2>Bestellung erfolgreich!</h2>
                  <p style={{color:"var(--mu)"}}>Vielen Dank für Ihren Einkauf bei MK-Electro.</p>

                  {/* Order ID mit Kopierfunktion */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:".6rem",margin:"1rem auto"}}>
                    <div className="ord-id">
                      <I d={ICONS.orders} size={14}/>
                      #{orderSuccess.id}
                    </div>
                    <CopyBtn value={orderSuccess.id} />
                  </div>

                  {/* Vorkasse: Bankverbindung groß + kopierbar */}
                  {orderSuccess.payment==="vorkasse" && (
                    <BankInfo orderId={orderSuccess.id} total={orderSuccess.total} />
                  )}

                  {orderSuccess.payment==="paypal" && (
                    <div style={{background:"rgba(0,156,222,.1)",border:"1px solid rgba(0,156,222,.25)",borderRadius:"10px",padding:"1rem",marginTop:".75rem"}}>
                      <div style={{fontWeight:700,color:"#009cde",marginBottom:".3rem"}}>💳 PayPal Zahlung bestätigt</div>
                      <div style={{fontSize:".8rem",color:"var(--mu)"}}>Betrag: <strong style={{color:"var(--tx)"}}>{fmt(orderSuccess.total)}</strong> · Zahlung eingegangen</div>
                    </div>
                  )}

                  <button className="btn btn-p" style={{marginTop:"1.4rem",width:"100%",justifyContent:"center"}} onClick={()=>setOrderSuccess(null)}>
                    Zurück zum Shop
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}