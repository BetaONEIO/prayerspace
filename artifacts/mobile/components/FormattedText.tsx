import React from "react";
import { View, Text, TextStyle } from "react-native";

type TextSegment = { text: string; bold?: boolean; italic?: boolean };

function parseInline(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let i = 0;
  let current = "";
  while (i < text.length) {
    if (text[i] === "*" && text[i + 1] === "*") {
      if (current) { segments.push({ text: current }); current = ""; }
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        segments.push({ text: text.slice(i + 2, end), bold: true });
        i = end + 2;
      } else { current += text[i]; i++; }
    } else if (text[i] === "_" && text[i - 1] !== "_" && text[i + 1] !== "_") {
      if (current) { segments.push({ text: current }); current = ""; }
      const end = text.indexOf("_", i + 1);
      if (end !== -1) {
        segments.push({ text: text.slice(i + 1, end), italic: true });
        i = end + 1;
      } else { current += text[i]; i++; }
    } else { current += text[i]; i++; }
  }
  if (current) segments.push({ text: current });
  return segments;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^## /gm, "")
    .replace(/^• /gm, "");
}

interface FormattedTextProps {
  text: string;
  baseStyle: TextStyle;
}

export default function FormattedText({ text, baseStyle }: FormattedTextProps) {
  const lines = text.split("\n");
  return (
    <View style={{ flex: 1 }}>
      {lines.map((line, lineIndex) => {
        if (line.startsWith("## ")) {
          const content = line.slice(3);
          const segs = parseInline(content);
          return (
            <Text key={lineIndex} style={[baseStyle, { fontSize: 18, fontWeight: "700" as const, marginBottom: 2 }]}>
              {segs.map((s, si) => (
                <Text key={si} style={{ fontWeight: "700" as const, fontStyle: s.italic ? "italic" as const : "normal" as const }}>{s.text}</Text>
              ))}
              {lineIndex < lines.length - 1 ? "\n" : ""}
            </Text>
          );
        }
        if (line.startsWith("• ")) {
          const content = line.slice(2);
          const segs = parseInline(content);
          return (
            <View key={lineIndex} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 2 }}>
              <Text style={[baseStyle, { marginRight: 6 }]}>•</Text>
              <Text style={[baseStyle, { flex: 1 }]}>
                {segs.map((s, si) => (
                  <Text key={si} style={{ fontWeight: s.bold ? "700" as const : "normal" as const, fontStyle: s.italic ? "italic" as const : "normal" as const }}>{s.text}</Text>
                ))}
              </Text>
            </View>
          );
        }
        const segs = parseInline(line);
        return (
          <Text key={lineIndex} style={baseStyle}>
            {segs.map((s, si) => (
              <Text key={si} style={{ fontWeight: s.bold ? "700" as const : "normal" as const, fontStyle: s.italic ? "italic" as const : "normal" as const }}>{s.text}</Text>
            ))}
            {lineIndex < lines.length - 1 ? "\n" : ""}
          </Text>
        );
      })}
    </View>
  );
}
