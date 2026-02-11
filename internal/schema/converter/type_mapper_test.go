package converter

import (
	"testing"
)

// 剝括號邏輯（MapDefaultValue 內 for 迴圈）邊界說明：
// - 僅當「整段字串」首字元為 ( 且末字元為 ) 時各去掉一個，不會單邊剝。
// - (x) → x；(x)(y) 會變成 x)(y（首尾不成對時仍剝一層，MSSQL default 通常不會如此）。
// - () → 剝一層變 ""，最後 return defaultValue 為 ""。
// - 不會無限迴圈：剝到首或尾不是括號就停。

func TestMapDefaultValue_StripParentheses(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		dataType   string
		want       string
		desc       string
	}{
		// 剝括號：一層外層 → 正確保留函數括號
		{"(sysutcdatetime()) one layer", "(sysutcdatetime())", "datetime2", "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'", "實際 bug：一層外層，剝一層後應為 sysutcdatetime()"},
		{"(getdate()) one layer", "(getdate())", "datetime", "CURRENT_TIMESTAMP", "一層外層 getdate"},
		{"(getutcdate()) one layer", "(getutcdate())", "datetime", "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'", "一層外層 getutcdate"},

		// 剝括號：兩層外層
		{"((sysutcdatetime())) two layers", "((sysutcdatetime()))", "datetime2", "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'", "兩層外層"},
		{"((getdate())) two layers", "((getdate()))", "datetime", "CURRENT_TIMESTAMP", "兩層 getdate"},

		// 無括號
		{"sysutcdatetime() no outer", "sysutcdatetime()", "datetime2", "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'", "本來就無外層"},
		{"getdate() no outer", "getdate()", "datetime", "CURRENT_TIMESTAMP", ""},

		// 數字 / bit 外層括號
		{"((0)) bit", "((0))", "bit", "FALSE", "兩層括號的 bit 0"},
		{"(0) bit", "(0)", "bit", "FALSE", "一層括號的 bit 0"},
		{"(1) bit", "(1)", "bit", "TRUE", ""},

		// 邊界：空、單字元、只有括號
		{"empty", "", "int", "", "空字串"},
		{"() empty parens", "()", "int", "", "剝掉後變空"},
		{"null", "(null)", "int", "NULL", "括號包 null"},

		// 其他：CONVERT/CAST 不轉、原樣或警告
		{"convert returns empty", "(convert(int, 0))", "int", "", "CONVERT 回傳空並加 warning"},
		{"literal with inner parens", "(something(inner))", "varchar", "something(inner)", "內層括號保留"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tm := NewTypeMapper()
			got := tm.MapDefaultValue(tt.input, tt.dataType)
			if got != tt.want {
				t.Errorf("MapDefaultValue(%q, %q) = %q, want %q. %s", tt.input, tt.dataType, got, tt.want, tt.desc)
			}
		})
	}
}

func TestMapDefaultValue_NoDoubleStripBug(t *testing.T) {
	// 關鍵：以前兩輪 Trim 會把 (sysutcdatetime()) 變成 sysutcdatetime(；現在剝一層後即停止
	tm := NewTypeMapper()
	in := "(sysutcdatetime())"
	got := tm.MapDefaultValue(in, "datetime2")
	want := "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'"
	if got != want {
		t.Fatalf("MapDefaultValue(%q) = %q, want %q (must not become sysutcdatetime() stripped to sysutcdatetime()", in, got, want)
	}
}
