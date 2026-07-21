import {
  MenuSearchField,
  type MenuSearchFocusAccent,
} from './MenuSearchField';
import { MenuSearchSection } from './MenuSearchSection';

type MenuSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  focusAccent?: MenuSearchFocusAccent;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
};

/** Sección + campo de búsqueda del menú (compone `MenuSearchSection` + `MenuSearchField`). */
export function MenuSearchBar({
  value,
  onChangeText,
  focusAccent,
  focused,
  onFocus,
  onBlur,
}: MenuSearchBarProps) {
  return (
    <MenuSearchSection>
      <MenuSearchField
        value={value}
        onChangeText={onChangeText}
        focusAccent={focusAccent}
        focused={focused}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </MenuSearchSection>
  );
}
