import React, { useRef, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { Calendar, X } from "lucide-react-native";
import { LightColors as Colors } from "@/constants/colors";
import { buildIsoFromParts, formatPrayerDate, daysUntil } from "@/lib/prayerDateUtils";

interface Props {
  value: string | null;
  onChange: (iso: string | null) => void;
  disabled?: boolean;
  allowPast?: boolean;
}

function pad2(n: string): string {
  return n.length === 1 ? `0${n}` : n;
}

export default function PrayerDatePicker({ value, onChange, disabled, allowPast }: Props) {
  const monthRef = useRef<TextInput | null>(null);
  const yearRef = useRef<TextInput | null>(null);

  const [day, month, year] = value
    ? value.split("-").map((p, i) => (i === 0 ? p : i === 1 ? p : p))
    : ["", "", ""];

  const parsedDay = value ? value.split("-")[2] : "";
  const parsedMonth = value ? value.split("-")[1] : "";
  const parsedYear = value ? value.split("-")[0] : "";

  const handleDayChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
    const iso = buildIsoFromParts(cleaned, parsedMonth, parsedYear);
    if (cleaned.length === 2) monthRef.current?.focus();
    if (iso && (allowPast || daysUntil(iso) >= 0)) {
      onChange(iso);
    } else if (!iso && (cleaned || parsedMonth || parsedYear)) {
      onChange(null);
    }
  }, [parsedMonth, parsedYear, onChange, allowPast]);

  const handleMonthChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
    if (cleaned.length === 2) yearRef.current?.focus();
    const iso = buildIsoFromParts(parsedDay, cleaned, parsedYear);
    if (iso && (allowPast || daysUntil(iso) >= 0)) {
      onChange(iso);
    } else {
      onChange(null);
    }
  }, [parsedDay, parsedYear, onChange, allowPast]);

  const handleYearChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
    const iso = buildIsoFromParts(parsedDay, parsedMonth, cleaned);
    if (iso && (allowPast || daysUntil(iso) >= 0)) {
      onChange(iso);
    } else {
      onChange(null);
    }
  }, [parsedDay, parsedMonth, onChange, allowPast]);

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const preview = value ? formatPrayerDate(value) : null;
  const hasValidDate = !!value;

  return (
    <View style={styles.container}>
      <View style={[styles.row, hasValidDate && styles.rowFilled]}>
        <Calendar size={16} color={hasValidDate ? Colors.primary : Colors.mutedForeground} />
        <TextInput
          style={styles.segment}
          placeholder="DD"
          placeholderTextColor={Colors.mutedForeground + "80"}
          value={parsedDay.replace(/^0/, "") || parsedDay}
          onChangeText={handleDayChange}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
          testID="prayer-date-day"
        />
        <Text style={styles.sep}>/</Text>
        <TextInput
          ref={monthRef}
          style={styles.segment}
          placeholder="MM"
          placeholderTextColor={Colors.mutedForeground + "80"}
          value={parsedMonth.replace(/^0/, "") || parsedMonth}
          onChangeText={handleMonthChange}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
          testID="prayer-date-month"
        />
        <Text style={styles.sep}>/</Text>
        <TextInput
          ref={yearRef}
          style={styles.segmentYear}
          placeholder="YYYY"
          placeholderTextColor={Colors.mutedForeground + "80"}
          value={parsedYear}
          onChangeText={handleYearChange}
          keyboardType="number-pad"
          maxLength={4}
          editable={!disabled}
          testID="prayer-date-year"
        />
        {hasValidDate && preview && (
          <View style={styles.previewPill}>
            <Text style={styles.previewText}>{preview}</Text>
          </View>
        )}
        {hasValidDate && (
          <Pressable onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
            <X size={14} color={Colors.mutedForeground} />
          </Pressable>
        )}
      </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  rowFilled: {
    borderColor: Colors.primary + "60",
    backgroundColor: Colors.primary + "08",
  },
  segment: {
    width: 28,
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
  previewPill: {
    flex: 1,
    alignItems: "flex-end",
  },
  previewText: {
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
    padding: 4,
  },
  helper: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginLeft: 4,
    lineHeight: 18,
  },
});
