import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cx, StateView } from './shared.jsx';

const MB = 1024 * 1024;
const formatSize = (bytes) => (bytes >= MB ? `${(bytes / MB).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`);

// react-dropzone 오류 코드 → 안내 문구
function errorMessage(rejection, { maxSize }) {
  const code = rejection.errors[0]?.code;
  const name = rejection.file.name;
  if (code === 'file-invalid-type') return `${name}: 허용되지 않는 파일 형식입니다.`;
  if (code === 'file-too-large') return `${name}: 최대 ${maxSize / MB}MB 까지 첨부할 수 있습니다.`;
  return `${name}: ${rejection.errors[0]?.message}`;
}

function FileList({ files, onRemove, boxType }) {
  if (!files.length) return null;
  return (
    <ul className={cx('fileList', { boxType })}>
      {files.map((f) => (
        <li key={f.id} className="fileItem">
          <div className="fileInfo">
            <a className="fileName" href={f.url || '#'} target="_blank" rel="noreferrer" onClick={f.url ? undefined : (e) => e.preventDefault()}>
              {f.name} <span className="fileSize">({formatSize(f.size)})</span>
            </a>
          </div>
          <button type="button" className="fileDelete" aria-label={`${f.name} 삭제`} onClick={() => onRemove(f.id)}>
            <span className="ico deleteTag"></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ==========================================================================
   이미지 단일 첨부 (첨부 전 드롭존 / 첨부 후 파일 목록)
   ========================================================================== */
function ImageSingleDemo() {
  const [image, setImage] = useState(null);
  return (
    <>
      <StepImageField image={image} onChange={setImage} />
      <StateView>image: {image ? `${image.name} (${formatSize(image.size)})` : '(없음)'}</StateView>
    </>
  );
}

/* ==========================================================================
   STEP 카드 (단계별 입력 폼 + 이미지 첨부 / 복사·삭제 / 핸들 드래그 순서 변경)
   - 마크업: src/components/fileupload.html
   ========================================================================== */
const STEP_IMAGE_RULE = { maxSize: 5 * MB };
let stepSeq = 1;
const newStep = (data = {}) => ({ name: '', condition: '', subText: '', image: null, ...data, id: `step${stepSeq++}` });

/** 단일 이미지 첨부 (새로 올리면 교체) */
function StepImageField({ image, onChange }) {
  const [error, setError] = useState('');
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (accepted, rejected) => {
      setError(rejected[0] ? errorMessage(rejected[0], STEP_IMAGE_RULE) : '');
      const file = accepted[0];
      if (!file) return;
      if (image?.url) URL.revokeObjectURL(image.url);
      onChange({ id: `${file.name}-${file.lastModified}`, name: file.name, size: file.size, url: URL.createObjectURL(file) });
    },
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: STEP_IMAGE_RULE.maxSize,
    multiple: false
  });

  const remove = () => {
    if (image?.url) URL.revokeObjectURL(image.url);
    onChange(null);
  };

  return (
    <div className="formControlWrap full col">
      {/* [파일 선택] 버튼(open)이 첨부 후에도 동작하도록 input 은 드롭존 밖에 둠 */}
      <input {...getInputProps()} />
      {/* [D] 첨부 전: 드롭존 노출 / 첨부 후: 드롭존 숨김 + 파일 목록 노출 */}
      {!image && (
        <div {...getRootProps({ className: cx('fileDropzone', { isDragOver: isDragActive }) })}>
          <div className="dropzoneHeader">
            <span className="ico xl upload"></span>
            <p className="dropzoneText">{isDragActive ? '여기에 놓으면 첨부됩니다.' : '파일 선택 또는 이미지를 끌어다 놓으세요.'}</p>
          </div>
        </div>
      )}
      <FileList files={image ? [image] : []} onRemove={remove} />
      {error && <p className="formErrorMsg">{error}</p>}
      <div className="formControlBottom">
        <span className="formGuideText">해당 STEP이 진행 단계일때 상단에 노출되는 이미지입니다. (JPG, PNG / 최대 5MB)</span>
        <button type="button" className="btn outline" onClick={open}>파일 선택</button>
      </div>
    </div>
  );
}

/** 정렬 가능한 STEP 카드 (원본 자리: .isDragging) */
function SortableStepCard(props) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: props.step.id });
  return (
    <StepCard
      {...props}
      cardRef={setNodeRef}
      className={cx({ isDragging })}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      handleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }}
    />
  );
}

const noop = () => {};

function StepCard({ step, index, canDelete, onChange = noop, onCopy, onDelete, cardRef, className, style, handleProps }) {
  const set = (key) => (e) => onChange({ ...step, [key]: e.target.value });

  return (
    <div ref={cardRef} className={cx('stepCard', className)} style={style}>
      <div className="stepHeader">
        <div className="stepTitleWrap">
          <span className="ico lg stepHandle" aria-label="STEP 순서 변경" {...handleProps}></span>
          <h4 className="stepTitle">STEP {index + 1}. {step.name || '새 단계'}</h4>
        </div>
        <div className="stepActions">
          <button type="button" className="btn outline sm" onClick={onCopy}>복사</button>
          <button type="button" className="btn danger sm" onClick={onDelete} disabled={!canDelete}>삭제</button>
        </div>
      </div>
      <table className="tbl">
        <colgroup>
          <col style={{ width: 100 }} />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <th><label className="formLabel" htmlFor={`${step.id}-name`}>코스명 <span className="required">*</span></label></th>
            <td><input id={`${step.id}-name`} type="text" className={cx('formControl full', { isError: !step.name })} value={step.name} onChange={set('name')} placeholder="코스명을 입력하세요" /></td>
          </tr>
          <tr>
            <th><label className="formLabel" htmlFor={`${step.id}-cond`}>수행조건 <span className="required">*</span></label></th>
            <td><input id={`${step.id}-cond`} type="text" className={cx('formControl full', { isError: !step.condition })} value={step.condition} onChange={set('condition')} placeholder="수행조건을 입력하세요" /></td>
          </tr>
          <tr>
            <th><label className="formLabel" htmlFor={`${step.id}-sub`}>보조 문구</label></th>
            <td><input id={`${step.id}-sub`} type="text" className="formControl full" value={step.subText} onChange={set('subText')} /></td>
          </tr>
          <tr>
            <th><span className="formLabel">상단 이미지</span></th>
            <td><StepImageField image={step.image} onChange={(image) => onChange({ ...step, image })} /></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StepCardDemo() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [steps, setSteps] = useState(() => [
    newStep({ name: '정상 미션', condition: '해당기간 100만원 이상 주문하기', subText: '자산 성장 성공', image: { id: 'sample', name: '소개 이미지.jpg', size: 1.5 * MB, url: null } }),
    newStep({ name: '도전 미션', condition: '해당기간 300만원 이상 주문하기' })
  ]);

  const update = (next) => setSteps((list) => list.map((s) => (s.id === next.id ? next : s)));
  // 복사 시 첨부 이미지는 제외 (미리보기 URL 공유 방지)
  const copy = (i) => setSteps((list) => [...list.slice(0, i + 1), newStep({ ...list[i], name: `${list[i].name} (복사)`, image: null }), ...list.slice(i + 1)]);
  const remove = (i) => setSteps((list) => {
    if (list[i].image?.url) URL.revokeObjectURL(list[i].image.url);
    return list.filter((_, j) => j !== i);
  });

  const [activeId, setActiveId] = useState(null);
  const activeIndex = steps.findIndex((s) => s.id === activeId);
  const endDrag = () => {
    setActiveId(null);
    document.body.classList.remove('isDndActive');
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => {
          setActiveId(active.id);
          document.body.classList.add('isDndActive');
        }}
        onDragCancel={endDrag}
        onDragEnd={({ active, over }) => {
          endDrag();
          if (over && active.id !== over.id) {
            setSteps((list) => arrayMove(list, list.findIndex((s) => s.id === active.id), list.findIndex((s) => s.id === over.id)));
          }
        }}
      >
        <SortableContext items={steps} strategy={verticalListSortingStrategy}>
          <div className="stepCardList">
            {steps.map((step, i) => (
              <SortableStepCard
                key={step.id}
                step={step}
                index={i}
                canDelete={steps.length > 1}
                onChange={update}
                onCopy={() => copy(i)}
                onDelete={() => remove(i)}
              />
            ))}
          </div>
        </SortableContext>
        {/* 커서를 따라다니는 미리보기: .stepCard.isOverlay */}
        <DragOverlay>
          {activeIndex >= 0 && (
            <StepCard step={steps[activeIndex]} index={activeIndex} canDelete={steps.length > 1} className="isOverlay" />
          )}
        </DragOverlay>
      </DndContext>
      <div style={{ marginTop: 12 }}>
        <button type="button" className="btn outline" onClick={() => setSteps((list) => [...list, newStep()])}>+ STEP 추가</button>
      </div>
      <StateView>{steps.map((s, i) => `STEP ${i + 1}: ${s.name || '-'} / 이미지: ${s.image ? s.image.name : '-'}`).join('\n')}</StateView>
    </>
  );
}

export default function UploadDemo() {
  return (
    <>
      <p className="libHint">드래그앤드롭 첨부는 단일 파일만 받습니다. 첨부 전에는 드롭존, 첨부 후에는 파일 목록이 노출되며 [파일 선택]으로 교체합니다. 형식·용량 위반 시 오류 문구가 표시됩니다.</p>
      <h3 className="libDemoTitle">1. 이미지 단일 첨부</h3>
      <ImageSingleDemo />
      <h3 className="libDemoTitle">2. STEP 카드 (이미지 첨부 + 복사·삭제 + 핸들 드래그로 순서 변경)</h3>
      <StepCardDemo />
    </>
  );
}
