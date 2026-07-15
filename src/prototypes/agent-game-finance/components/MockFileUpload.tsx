import React, { useRef } from 'react';
import { CircleCheck, FileText, X } from 'lucide-react';

export interface MockFileItem {
  id: string;
  name: string;
  blob: Blob;
}

interface MockFileUploadProps {
  accept?: string;
  files: MockFileItem[];
  onChange: (files: MockFileItem[]) => void;
}

function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  return 'application/octet-stream';
}

function downloadFile(file: MockFileItem) {
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MockFileUpload({ accept, files, onChange }: MockFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange([...files, { id: `${Date.now()}-${file.name}`, name: file.name, blob: file }]);
    }
    e.target.value = '';
  };

  const handleRemove = (id: string) => {
    onChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="agf-file-upload">
      <div className="agf-file-upload__toolbar">
        <button type="button" className="agf-btn agf-btn--primary" onClick={handleSelect}>
          选择文件
        </button>
        <input ref={inputRef} type="file" className="agf-file-upload__input" accept={accept} onChange={handleChange} />
      </div>
      {files.length > 0 && (
        <ul className="agf-file-upload__list">
          {files.map((file) => (
            <li key={file.id} className="agf-file-upload__item">
              <FileText size={16} className="agf-file-upload__icon" aria-hidden />
              <button type="button" className="agf-file-upload__name" onClick={() => downloadFile(file)} title={file.name}>
                {file.name}
              </button>
              <CircleCheck size={16} className="agf-file-upload__status" aria-hidden />
              <button
                type="button"
                className="agf-file-upload__remove"
                onClick={() => handleRemove(file.id)}
                aria-label={`删除 ${file.name}`}
                title="删除"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function mockFileFromName(name: string, content = '模拟文件内容'): MockFileItem {
  return {
    id: `mock-${name}`,
    name,
    blob: new Blob([content], { type: mimeFromName(name) }),
  };
}
