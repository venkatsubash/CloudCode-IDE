import Icon from "../common/Icon";
import { ICONS } from "../../data/editorData";

function FileExplorer({
  items,
  activeId,
  onOpen,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}) {
  return (
    <aside className="ed-files" aria-label="File explorer">
      <div className="ed-panel-title">Files</div>

      <ul className="ed-tree">
        {items.map((it) => (
          <li key={it.id}>
            <div
              className={`ed-item ${
                it.type === "folder"
                  ? "folder"
                  : "nested"
              }`}
              tabIndex={0}
              aria-current={
                it.id === activeId
                  ? "true"
                  : undefined
              }
              onClick={() =>
                it.type === "file" &&
                onOpen(it.id)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                it.type === "file" &&
                onOpen(it.id)
              }
            >
              <Icon
                d={
                  it.type === "folder"
                    ? ICONS.folder
                    : ICONS.file
                }
              />

              <span>{it.name}</span>

              <div
                className="acts"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >
                <button
                  aria-label={`Rename ${it.name}`}
                  onClick={() =>
                    onRename(it.id)
                  }
                >
                  <Icon d={ICONS.edit} />
                </button>

                <button
                  aria-label={`Delete ${it.name}`}
                  onClick={() =>
                    onDelete(it.id)
                  }
                >
                  <Icon d={ICONS.trash} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="ed-new">
        <button onClick={onNewFile}>
          <Icon d={ICONS.plus} />
          New File
        </button>

        <button onClick={onNewFolder}>
          <Icon d={ICONS.plus} />
          New Folder
        </button>
      </div>
    </aside>
  );
}

export default FileExplorer;