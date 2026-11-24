import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { messageFor } from "@/api/errors";
import { shopApi, type Place } from "@/api/endpoints/shop";
import { Button, Card, Chip, Sheet, Text, useToast } from "@/components/ui";
import { t } from "@/i18n";
import { buzz } from "@/lib/haptics";
import { useTheme } from "@/theme";

import { whereAmI } from "./position";

/**
 * Where the shop's staff mark themselves present from — the shop, its godown — and saving one from
 * where the owner stands: the one thing here a phone does better than the website. The server
 * keeps up to three, each by name; saving a name again moves it. It wants the phone sure of where
 * it is to within 100 m, and says so in its own words when it isn't.
 */
export function PlacesCard({ orgId, places, onSaved }: { orgId: string; places: Place[]; onSaved: (places: Place[]) => void }) {
  const { colors, space } = useTheme();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<"shop" | "godown">("shop");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const where = await whereAmI();
      if (where.kind !== "here") {
        buzz.warning();
        setError(t("shop.register.placeNoFix"));
        return;
      }
      const saved = await shopApi.savePlace(orgId, {
        name: name === "shop" ? t("shop.register.placeShop") : t("shop.register.placeGodown"),
        ...where.position,
      });
      buzz.success();
      onSaved(saved);
      setOpen(false);
      toast.show(t("shop.register.placeSaved"), "success");
    } catch (err) {
      buzz.warning();
      setError(messageFor(err, t("shop.register.placeFailed")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card testID="places" style={{ gap: space.sm }}>
      <Text variant="title3" accessibilityRole="header">
        {t("shop.register.places")}
      </Text>
      {places.length === 0 ? (
        <Text variant="body" tone="soft">
          {t("shop.register.noPlaces")}
        </Text>
      ) : (
        places.map((place) => (
          <View key={place.id} style={styles.place} testID={`place-${place.id}`}>
            <Feather name="map-pin" size={18} color={colors.accentText} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {place.name}
            </Text>
            <Text variant="small" tone="mute">
              {t("shop.register.radius", { n: place.radiusMetres })}
            </Text>
          </View>
        ))
      )}
      <Button
        variant="secondary"
        icon="crosshair"
        label={t("shop.register.savePlace")}
        onPress={() => {
          setError(null);
          setOpen(true);
        }}
        testID="place-save"
      />

      <Sheet visible={open} onClose={busy ? () => {} : () => setOpen(false)} title={t("shop.register.savePlaceTitle")} testID="place-sheet">
        <View style={{ gap: space.md }}>
          <Text variant="body" tone="soft">
            {t("shop.register.savePlaceBody")}
          </Text>
          <View style={{ gap: space.xs }}>
            <Text variant="fieldLabel">{t("shop.register.placeName")}</Text>
            <View style={{ flexDirection: "row", gap: space.xs }}>
              <Chip label={t("shop.register.placeShop")} role="radio" selected={name === "shop"} onPress={() => setName("shop")} testID="place-name-shop" />
              <Chip label={t("shop.register.placeGodown")} role="radio" selected={name === "godown"} onPress={() => setName("godown")} testID="place-name-godown" />
            </View>
          </View>
          {error ? (
            <Text variant="small" tone="danger" accessibilityLiveRegion="polite" testID="place-error">
              {error}
            </Text>
          ) : null}
          <Button icon="map-pin" label={t("shop.register.savePlace")} loading={busy} onPress={() => void save()} testID="place-save-confirm" />
        </View>
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  place: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 },
});
