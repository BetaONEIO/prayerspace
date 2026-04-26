import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { X, CalendarDays } from "lucide-react-native";
import { LightColors as Colors } from "@/constants/colors";
import {
  buildIsoFromParts,
  formatPrayerDate,
  generateQuickDateOptions,
  type QuickDateOption,
} from "@/lib/prayerDateUtils";

interface Props {
  value: string | null;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
}

const QUICK_OPTIONS = generateQuickDateOptions();

export default function PrayerDatePicker({ value, onChange, disabled }: Props) {
  const [customActive, setCustomActive] = useState(false);
  const [customDay, setCustomDay] = useState("");
  const [customMonth, setCustomMonth] = useState("");
  const [customYear, setCustomYear] = useState("");
  const monthRef = useRef<TextInput | null>(null);
  const yearRef = useRef<TextInput | null>(null);

  const selectedKey = value
    ? QUICK_OPTIONS.find((o) => o.iso === value)?.key ?? (customActive ? "custom" : null)
    : null;

  const handleOptionPress = useCallback(
    (opt: QuickDateOption) => {
      if (disabled) return;
      if (opt.isCustom) {
        setCustomActive(true);
        onChange(null);
        return;
      }
      setCustomActive(false);
      setCustomDay("");
      setCustomMonth("");
      setCustomYear("");
      onChange(opt.iso);
    },
    [onChange, disabled]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setCustomActive(false);
    setCustomDay("");
    setCustomMonth("");
    setCustomYear("");
  }, [onChange]);

  const handleDayChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
      setCustomDay(cleaned);
      if (cleaned.length === 2) monthRef.current?.focus();
      const iso = buildIsoFromParts(cleaned, customMonth, customYear);
      onChange(iso);
    },
    [customMonth, customYear, onChange]
  );

  const handleMonthChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
      setCustomMonth(cleaned);
      if (cleaned.length === 2) yearRef.current?.focus();
      const iso = buildIsoFromParts(customDay, cleaned, customYear);
      onChange(iso);
    },
    [customDay, customYear, onChange]
  );

  const handleYearChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
      setCustomYear(cleaned);
      const iso = buildIsoFromParts(customDay, customMonth, cleaned);
      onChange(iso);
    },
    [customDay, customMonth, onChange]
  );

  const ROW_1 = QUICK_OPTIONS.slice(0, 2);
  const ROW_2 = QUICK_OPTIONS.slice(2, 5);
  const ROW_3 = QUICK_OPTIONS.slice(5, 8);
  const CUSTOM_OPT = QUICK_OPTIONS[8];

  function OptionChip({ opt }: { opt: QuickDateOption }) {
    const isSelected = opt.isCustom ? customActive : opt.iso === value;
    return (
      <Pressable
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => handleOptionPress(opt)}
        disabled={disabled}
      >
        <Text
          style={[styles.chipText, isSelected && styles.chipTextSelected]}
          numberOfLines={1}
        >
          {opt.label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row1}>
        {ROW_1.map((opt) => (
          <View key={opt.key} style={styles.halfCell}>
            <OptionChip opt={opt} />
          </View>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        style={styles.scrollWrap}
      >
        {ROW_2.map((opt) => (
          <OptionChip key={opt.key} opt={opt} />
        ))}
      </ScrollView>

      <View style={styles.row1}>
        {ROW_3.map((opt) => (
          <View key={opt.key} style={styles.thirdCell}>
            <OptionChip opt={opt} />
          </View>
        ))}
      </View>

      {CUSTOM_OPT && (
        <Pressable
          style={[styles.customRow, customActive && styles.customRowActive]}
          onPress={() => handleOptionPress(CUSTOM_OPT)}
          disabled={disabled}
        >
          <CalendarDays
            size={15}
            color={customActive ? Colors.primary : Colors.mutedForeground}
          />
          <Text
            style={[
              styles.customRowLabel,
              customActive && styles.customRowLabelActive,
            ]}
          >
            Set a date
          </Text>
        </Pressable>
      )}

      {customActive && (
        <View style={styles.customInputWrap}>
          <TextInput
            style={styles.segment}
            placeholder="DD"
            placeholderTextColor={Colors.mutedForeground + "80"}
            value={customDay}
            onChangeText={handleDayChange}
            keyboardType="number-pad"
            maxLength={2}
            editable={!disabled}
          />
          <Text style={styles.sep}>/</Text>
          <TextInput
            ref={monthRef}
            style={styles.segment}
            placeholder="MM"
            placeholderTextColor={Colors.mutedForeground + "80"}
            value={customMonth}
            onChangeText={handleMonthChange}
            keyboardType="number-pad"
            maxLength={2}
            editable={!disabled}
          />
          <Text style={styles.sep}>/</Text>
          <TextInput
            ref={yearRef}
            style={styles.segmentYear}
            placeholder="YYYY"
            placeholderTextColor={Colors.mutedForeground + "80"}
            value={customYear}
            onChangeText={handleYearChange}
            keyboardType="number-pad"
            maxLength={4}
            editable={!disabled}
          />
          {value && (
            <View style={styles.customPreview}>
              <Text style={styles.customPreviewText}>
                {formatPrayerDate(value)}
              </Text>
            </View>
          )}
        </View>
      )}

      {value && !customActive && (
        <Pressable style={styles.clearBtn} onPress={handleClear} hitSlop={8}>
          <X size={12} color={Colors.mutedForeground} />
          <Text style={styles.clearText}>Clear date</Text>
        </Pressable>
      )}

      <Text style={styles.helper}>
        Add a date if this prayer is connected to a specific day or event.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row1: {
    flexDirection: "row",
    gap: 8,
  },
  halfCell: {
    flex: 1,
  },
  thirdCell: {
    flex: 1,
  },
  scrollWrap: {
    marginHorizontal: -2,
  },
  scrollRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    backgroundColor: Colors.primary + "14",
    borderColor: Colors.primary + "60",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.secondaryForeground,
    textAlign: "center",
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: "700",
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  customRowActive: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary + "50",
  },
  customRowLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.mutedForeground,
  },
  customRowLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  customInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.primary + "50",
  },
  segment: {
    width: 30,
    fontSize: 15,
    color: Colors.foreground,
    textAlign: "center",
    padding: 0,
  },
  segmentYear: {
    width: 48,
    fontSize: 15,
    color: Colors.foreground,
    textAlign: "center",
    padding: 0,
  },
  sep: {
    fontSize: 15,
    color: Colors.mutedForeground,
    fontWeight: "600",
  },
  customPreview: {
    flex: 1,
    alignItems: "flex-end",
  },
  customPreviewText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    backgroundColor: Colors.primary + "12",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.muted,
  },
  clearText: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "600",
  },
  helper: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
});
