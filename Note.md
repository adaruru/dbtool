# Note

撰寫專案需要的技術說明

### Zustand

Zustand 使用 **store** 來管理狀態，你可以直接從 store 讀取或修改狀態，而 React 元件會自動訂閱相關狀態，當狀態變化時自動更新。

總結來說，Zustand 是 **簡單、高效、靈活的 React 狀態管理方案**，非常適合中小型專案或希望避免 Redux 繁瑣配置的場景。

### SQLite CGO

`github.com/mattn/go-sqlite3` 依賴 CGO 進行編譯，當 CGO 被禁用時，它無法編譯，因此不能在無 CGO 環境中使用。


1. CGO_ENABLED=0
2. 交叉編譯（如 Linux → Alpine、Scratch、ARM）
3. 無法安裝系統層 SQLite / gcc（CI、容器、Serverless）

為了解決這個問題，必須使用 **純 Go 的 SQLite 驅動** (不需要 CGO 的套件)`modernc.org/sqlite v1.44.2`。

這個驅動完全不依賴 CGO，與 `database/sql` 相容，可直接替換原本的 SQLite 驅動，並且在任何環境下（包括容器化或交叉編譯）都能穩定運行。安裝方式只需在專案中加入依賴 `modernc.org/sqlite v1.44.2`，原本的 SQL 操作邏輯不需要修改。