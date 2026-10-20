import {
  Box,
  Car,
  Container,
  Database,
  Film,
  Hash,
  Heading,
  Image,
  Keyboard,
  ListTodo,
  Puzzle,
  Zap,
} from 'lucide-vue-next'
import type { Component } from 'vue'

const ICON_MAP: Record<string, Component> = {
  Container,
  Database,
  Zap,
  Keyboard,
  Puzzle,
  Heading,
  Car,
  Image,
  Hash,
  Film,
  ListTodo,
  Box,
}

export function getToolIcon(iconName: string): Component {
  return ICON_MAP[iconName] ?? Box
}
