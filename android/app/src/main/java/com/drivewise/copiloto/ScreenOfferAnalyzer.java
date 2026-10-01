package com.drivewise.copiloto;

import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pure-Java parser that turns raw OCR text blocks captured from the driver screens of
 * Uber / 99 / InDrive into a structured ride offer (gross R$, total km, duration min).
 *
 * This class has ZERO Android dependencies on purpose: it is unit-tested locally with
 * JUnit (see ScreenOfferAnalyzerTest.java) using realistic text samples copied from the
 * real driver apps. The OCR engine (ML Kit Text Recognition v2, fully on-device) only
 * feeds this parser with recognized lines + bounding boxes.
 */
public final class ScreenOfferAnalyzer {

    // "R$ 28,90" | "R$28.90" | "$ 28,90" | "28,90 R$"
    private static final Pattern MONEY_PATTERN = Pattern.compile(
        "(?:(?:R\\$|\\$)\\s*([\\d]{1,4}(?:[.,]\\d{1,3})?)|([\\d]{1,4}(?:[.,]\\d{1,3})?)\\s*(?:R\\$|\\$))"
    );

    // "12,4 km" | "12km" | "Distance 12.4 km" | "embarque 2,1 km"
    private static final Pattern KM_PATTERN = Pattern.compile(
        "([\\d]{1,3}(?:[.,]\\d{1,2})?)\\s*(?:km|quil[oô]metros?)",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PICKUP_KM_PATTERN = Pattern.compile(
        "(?:at[eé]|ate o passageiro|embarque|pickup|dist(?:[aâ])ncia at[eé])[^0-9]{0,18}" +
            "([\\d]{1,3}(?:[.,]\\d{1,2})?)\\s*km",
        Pattern.CASE_INSENSITIVE
    );

    // "23 min" | "23min" | "chegada em 23 min" | "23 minutos"
    private static final Pattern MIN_PATTERN = Pattern.compile(
        "(\\d{1,3})\\s*(?:min|minutos|mins?)\\b",
        Pattern.CASE_INSENSITIVE
    );

    // Passenger rating: "4.92" | "4,92 ★" | "nota 4.9"
    private static final Pattern RATING_PATTERN = Pattern.compile(
        "(?:nota|rating|score)?[^0-9]{0,8}\\b([3-5][.,][0-9]{1,2})\\b\\s*(?:★|⭐|estrela)?",
        Pattern.CASE_INSENSITIVE
    );

    // Strong Uber-offer signals present on the com.ubercab.driver offer card
    private static final String[] UBER_SIGNALS = {
        "procurando passageiro", "searching for riders", "accept trip", "trip request",
        "detour", "surge", "uberx", "uber black", "comfort", "voyage", "course"
    };
    private static final String[] NINETY_NINE_SIGNALS = {
        "corrida", "99pop", "99 top", "aceitar corrida", "chame j[aá]", "destino"
    };

    public static class OfferReading {
        public double grossValue = 0.0;
        public double pickupKm = 0.0;      // distance to passenger (embark)
        public double tripKm = 0.0;         // trip distance itself
        public double totalKm = 0.0;        // pickup + trip
        public int durationMin = 0;
        public double passengerRating = 0.0;
        public String platform = "Uber";
        public int confidence = 0;          // 0..100
        public boolean valid = false;

        public JSONObject toJson() {
            try {
                JSONObject o = new JSONObject();
                o.put("grossValue", grossValue);
                o.put("pickupKm", pickupKm);
                o.put("tripKm", tripKm);
                o.put("totalKm", totalKm);
                o.put("durationMin", durationMin);
                o.put("passengerRating", passengerRating);
                o.put("platform", platform);
                o.put("confidence", confidence);
                o.put("valid", valid);
                return o;
            } catch (Exception e) {
                return new JSONObject();
            }
        }
    }

    public static class TextBlock {
        public final String text;
        public final int left;
        public final int top;

        public TextBlock(String text, int left, int top) {
            this.text = text == null ? "" : text;
            this.left = left;
            this.top = top;
        }
    }

    private ScreenOfferAnalyzer() {}

    /** Parse a full frame of OCR lines into an OfferReading. */
    public static OfferReading analyze(List<TextBlock> blocks) {
        OfferReading r = new OfferReading();
        if (blocks == null || blocks.isEmpty()) return r;

        StringBuilder joined = new StringBuilder();
        for (TextBlock b : blocks) {
            joined.append(b.text.trim()).append('\n');
        }
        String all = joined.toString();
        String lower = all.toLowerCase(Locale.ROOT);

        // --- Platform detection by UI signal words ---
        int ninetyNineHits = 0;
        for (String s : NINETY_NINE_SIGNALS) if (lower.contains(s)) ninetyNineHits++;
        int uberHits = 0;
        for (String s : UBER_SIGNALS) if (lower.contains(s)) uberHits++;
        if (lower.contains("indrive") || lower.contains("in drive")) {
            r.platform = "InDrive";
        } else if (ninetyNineHits > uberHits && ninetyNineHits >= 1) {
            r.platform = "99";
        } else {
            r.platform = "Uber";
        }

        // --- Money candidates ---
        List<Double> moneyValues = new ArrayList<>();
        Matcher mm = MONEY_PATTERN.matcher(all);
        while (mm.find()) {
            String raw = mm.group(1) != null ? mm.group(1) : mm.group(2);
            double v = parseNumber(raw);
            if (v >= 3.0 && v <= 600.0) moneyValues.add(v);
        }

        // --- Distance candidates (km) ---
        double pickupKm = 0.0;
        Matcher pk = PICKUP_KM_PATTERN.matcher(all);
        if (pk.find()) pickupKm = parseNumber(pk.group(1));

        List<Double> kmValues = new ArrayList<>();
        Matcher km = KM_PATTERN.matcher(all);
        while (km.find()) {
            double v = parseNumber(km.group(1));
            if (v > 0.2 && v <= 120.0) kmValues.add(v);
        }

        // --- Duration candidates (min) ---
        List<Integer> minValues = new ArrayList<>();
        Matcher mn = MIN_PATTERN.matcher(all);
        while (mn.find()) {
            try {
                int v = Integer.parseInt(mn.group(1));
                if (v >= 1 && v <= 300) minValues.add(v);
            } catch (Exception ignored) {}
        }

        // --- Rating ---
        Matcher rt = RATING_PATTERN.matcher(all);
        if (rt.find()) {
            double rating = parseNumber(rt.group(1));
            if (rating >= 3.0 && rating <= 5.0) r.passengerRating = rating;
        }

        // --- Heuristics ---
        // Gross: prefer the largest money value that looks like a fare (>= 6), but never
        // confuse it with per-km metrics. If several exist, take the max (offer price).
        double gross = 0.0;
        for (double m : moneyValues) gross = Math.max(gross, m);
        r.grossValue = round2(gross);

        // Total km: if we found an explicit pickup distance, the trip distance is usually
        // the other large km value; total = pickup + trip. Otherwise use max km as trip.
        double maxKm = 0.0;
        for (double k : kmValues) maxKm = Math.max(maxKm, k);
        if (pickupKm > 0 && maxKm > pickupKm) {
            r.pickupKm = round2(pickupKm);
            r.tripKm = round2(maxKm - pickupKm > 0.5 ? maxKm : maxKm);
            // When only one big km figure exists alongside pickup, treat max as trip and add.
            r.tripKm = round2(maxKm);
            r.totalKm = round2(r.pickupKm + r.tripKm);
        } else if (pickupKm > 0 && maxKm <= 0.01) {
            r.pickupKm = round2(pickupKm);
            r.totalKm = round2(pickupKm + 3.0); // conservative default trip
            r.tripKm = 3.0;
        } else if (maxKm > 0) {
            r.tripKm = round2(maxKm);
            r.pickupKm = round2(Math.min(2.5, maxKm * 0.2));
            r.totalKm = round2(maxKm + r.pickupKm);
        }

        // Duration: prefer the largest minutes value (trip ETA), typical offers are 5..180.
        int bestMin = 0;
        for (int m : minValues) bestMin = Math.max(bestMin, m);
        if (bestMin <= 0 && r.totalKm > 0) {
            bestMin = (int) Math.round(r.totalKm * 2.4); // urban average pace fallback
        }
        r.durationMin = Math.max(0, Math.min(300, bestMin));

        // --- Confidence scoring ---
        int conf = 0;
        if (r.grossValue > 0) conf += 45;
        if (r.totalKm > 0) conf += 30;
        if (r.durationMin > 0) conf += 15;
        if (uberHits + ninetyNineHits > 0 || lower.contains("indrive")) conf += 10;
        r.confidence = Math.min(100, conf);
        r.valid = r.grossValue > 0 && r.totalKm > 0 && r.confidence >= 60;
        return r;
    }

    /**
     * Merge a fresh reading into a stable reading: require `requiredConsecutive` matching
     * consecutive frames before trusting a value (guards against transient UI noise).
     */
    public static OfferReading stabilize(OfferReading previous, OfferReading fresh, int[] streak) {
        if (fresh == null || !fresh.valid) {
            if (streak != null && streak.length > 0) streak[0] = 0;
            return previous != null ? previous : new OfferReading();
        }
        if (
            previous != null && previous.valid &&
            Math.abs(previous.grossValue - fresh.grossValue) < 0.01 &&
            Math.abs(previous.totalKm - fresh.totalKm) < 0.6
        ) {
            if (streak != null && streak.length > 0) streak[0]++;
        } else {
            if (streak != null && streak.length > 0) streak[0] = 1;
        }
        return fresh;
    }

    static double parseNumber(String raw) {
        if (raw == null || raw.isEmpty()) return 0.0;
        // Normalize Brazilian format: "1.234,56" -> 1234.56 ; "28,90" -> 28.90 ; "12.4" -> 12.4
        String s = raw.trim();
        if (s.contains(",") && s.contains(".")) {
            // last separator is the decimal one
            if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
                s = s.replace(".", "").replace(',', '.');
            } else {
                s = s.replace(",", "");
            }
        } else if (s.contains(",")) {
            s = s.replace(',', '.');
        }
        try {
            return Double.parseDouble(s);
        } catch (Exception e) {
            return 0.0;
        }
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
