package com.drivewise.copiloto;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Local JVM unit tests for the Zero-Touch Auto-Read parser.
 * ScreenOfferAnalyzer is pure Java (no Android APIs), so it runs with plain JUnit.
 */
public class ScreenOfferAnalyzerTest {

    private static List<ScreenOfferAnalyzer.TextBlock> blocks(String... lines) {
        List<ScreenOfferAnalyzer.TextBlock> list = new ArrayList<>();
        int top = 0;
        for (String line : lines) {
            list.add(new ScreenOfferAnalyzer.TextBlock(line, 10, top));
            top += 40;
        }
        return list;
    }

    // ---------- parseNumber: pt-BR formats ----------

    @Test
    public void parsesBrazilianDecimalComma() {
        assertEquals(28.90, ScreenOfferAnalyzer.parseNumber("28,90"), 0.001);
    }

    @Test
    public void parsesBrazilianThousandsDotDecimalComma() {
        assertEquals(1234.56, ScreenOfferAnalyzer.parseNumber("1.234,56"), 0.001);
    }

    @Test
    public void parsesPlainInteger() {
        assertEquals(15.0, ScreenOfferAnalyzer.parseNumber("15"), 0.001);
    }

    // ---------- full offer reading (Uber-style screen text) ----------

    @Test
    public void readsUberOfferFromTypicalScreenText() {
        ScreenOfferAnalyzer.OfferReading r = ScreenOfferAnalyzer.analyze(blocks(
                "Uber",
                "Corrida para o aeroporto",
                "R$ 28,90",
                "Embarque a 1,2 km",
                "Viagem de 8,5 km",
                "24 min",
                "Passageiro ★ 4,9"
        ));
        assertTrue("reading should be valid", r.valid);
        assertEquals(28.90, r.grossValue, 0.001);
        assertEquals(8.5, r.tripKm, 0.001);
        assertTrue("total distance must include pickup leg", r.totalKm >= 8.5);
        assertEquals(24, r.durationMin);
        assertEquals("Uber", r.platform);
        assertTrue("confidence should be high on a complete offer", r.confidence >= 70);
    }

    @Test
    public void readsNineteenNinetyPlatformSignal() {
        ScreenOfferAnalyzer.OfferReading r = ScreenOfferAnalyzer.analyze(blocks(
                "99",
                "Solicitação de corrida",
                "R$ 45,00",
                "Buscar passageiro: 2,0 km",
                "Destino: 11 km",
                "30 min"
        ));
        assertTrue(r.valid);
        assertEquals(45.0, r.grossValue, 0.001);
        assertEquals("99", r.platform);
    }

    @Test
    public void rejectsScreenWithoutMoneyValue() {
        ScreenOfferAnalyzer.OfferReading r = ScreenOfferAnalyzer.analyze(blocks(
                "Configurações",
                "Conta",
                "Ajuda"
        ));
        assertFalse("no price on screen -> not a ride offer", r.valid);
    }

    // ---------- anti-flicker stabilization ----------

    @Test
    public void stabilizeRequiresConsecutiveIdenticalReadings() {
        int[] streak = new int[1];
        ScreenOfferAnalyzer.OfferReading fresh = ScreenOfferAnalyzer.analyze(blocks(
                "Uber", "R$ 28,90", "Embarque 1,2 km", "Viagem 8,5 km", "24 min"));
        assertTrue(fresh.valid);

        // first reading of a new offer starts the streak at 1
        ScreenOfferAnalyzer.stabilize(null, fresh, streak);
        assertEquals(1, streak[0]);

        // second identical reading increments the streak
        ScreenOfferAnalyzer.stabilize(fresh, fresh, streak);
        assertTrue("streak should grow on identical consecutive readings", streak[0] >= 2);

        // different reading resets the streak
        ScreenOfferAnalyzer.OfferReading other = ScreenOfferAnalyzer.analyze(blocks(
                "Uber", "R$ 33,10", "Embarque 1,2 km", "Viagem 8,5 km", "24 min"));
        ScreenOfferAnalyzer.stabilize(fresh, other, streak);
        assertEquals("streak must reset when value changes", 1, streak[0]);

        // invalid reading zeroes the streak
        ScreenOfferAnalyzer.stabilize(other, null, streak);
        assertEquals(0, streak[0]);
    }

    @Test
    public void toJsonExposesAllFieldsForTheWebLayer() throws Exception {
        ScreenOfferAnalyzer.OfferReading r = ScreenOfferAnalyzer.analyze(Arrays.asList(
                new ScreenOfferAnalyzer.TextBlock("Uber", 0, 0),
                new ScreenOfferAnalyzer.TextBlock("R$ 28,90", 0, 40)));
        String json = r.toJson().toString();
        assertTrue(json.contains("grossValue"));
        assertTrue(json.contains("platform"));
        assertTrue(json.contains("confidence"));
    }
}
