import React, { useState, useRef, useEffect } from 'react';
import { Plus, StickyNote } from 'lucide-react';

interface Note {
    id: number;
    x: number;
    y: number;
    text: string;
    color: string;
}

export function Freeboard() {
    const [notes, setNotes] = useState<Note[]>([
        { id: 1, x: 100, y: 100, text: 'メモ 1', color: '#5865f2' },
        { id: 2, x: 300, y: 150, text: 'メモ 2', color: '#57f287' },
        { id: 3, x: 150, y: 300, text: 'メモ 3', color: '#fee75c' },
    ]);

    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const boardRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.note')) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setOffset({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('.note')) return;
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const newX = touch.clientX - dragStart.x;
        const newY = touch.clientY - dragStart.y;
        setOffset({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    const addNote = () => {
        const newNote: Note = {
            id: Date.now(),
            x: Math.random() * 200 + 50,
            y: Math.random() * 200 + 50,
            text: `新しいメモ ${notes.length + 1}`,
            color: ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245'][
                Math.floor(Math.random() * 5)
            ],
        };
        setNotes([...notes, newNote]);
    };

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Grid Background */}
            <div
                ref={boardRef}
                className="absolute inset-0 active:cursor-grabbing"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: `${offset.x}px ${offset.y}px`,
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Canvas Container */}
                <div
                    className="absolute"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                        width: '2000px',
                        height: '2000px',
                    }}
                >
                    {/* Notes */}
                    {notes.map((note) => (
                        <NoteCard key={note.id} note={note} setNotes={setNotes} />
                    ))}
                </div>
            </div>

            {/* Add Button */}
            <button
                onClick={addNote}
                className="absolute bottom-5 right-5 w-14 h-14 bg-[#5865f2] active:bg-[#4752c4] rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95"
                aria-label="メモを追加"
            >
                <Plus className="w-7 h-7 text-white" />
            </button>

            {/* Info */}
            <div className="absolute top-3 left-3 bg-[#2b2d31]/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
                <p className="text-[#b5bac1] text-xs flex items-center">
                    <StickyNote className="w-3.5 h-3.5 inline mr-1.5" />
                    ドラッグして移動
                </p>
            </div>
        </div>
    );
}

interface NoteCardProps {
    note: Note;
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

function NoteCard({ note, setNotes }: NoteCardProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(note.text);

    const handleNoteMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - note.x,
            y: e.clientY - note.y,
        });
    };

    const handleNoteMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setNotes((prev) =>
            prev.map((n) => (n.id === note.id ? { ...n, x: newX, y: newY } : n))
        );
    };

    const handleNoteMouseUp = () => {
        setIsDragging(false);
    };

    const handleNoteTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        const touch = e.touches[0];
        setIsDragging(true);
        setDragOffset({
            x: touch.clientX - note.x,
            y: touch.clientY - note.y,
        });
    };

    const handleNoteTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const newX = touch.clientX - dragOffset.x;
        const newY = touch.clientY - dragOffset.y;
        setNotes((prev) =>
            prev.map((n) => (n.id === note.id ? { ...n, x: newX, y: newY } : n))
        );
    };

    const handleNoteTouchEnd = () => {
        setIsDragging(false);
    };

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        setNotes((prev) =>
            prev.map((n) => (n.id === note.id ? { ...n, text: editText } : n))
        );
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleNoteMouseMove);
            document.addEventListener('mouseup', handleNoteMouseUp);
            document.addEventListener('touchmove', handleNoteTouchMove);
            document.addEventListener('touchend', handleNoteTouchEnd);

            return () => {
                document.removeEventListener('mousemove', handleNoteMouseMove);
                document.removeEventListener('mouseup', handleNoteMouseUp);
                document.removeEventListener('touchmove', handleNoteTouchMove);
                document.removeEventListener('touchend', handleNoteTouchEnd);
            };
        }
    }, [isDragging, dragOffset]);

    return (
        <div
            className="note absolute w-36 h-36 p-3 rounded-xl shadow-xl active:shadow-2xl transition-shadow"
            style={{
                left: `${note.x}px`,
                top: `${note.y}px`,
                backgroundColor: note.color,
            }}
            onMouseDown={handleNoteMouseDown}
            onTouchStart={handleNoteTouchStart}
            onDoubleClick={handleDoubleClick}
        >
            {isEditing ? (
                <textarea
                    className="w-full h-full bg-transparent text-white placeholder-white/60 resize-none outline-none font-medium text-sm"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleBlur}
                    autoFocus
                />
            ) : (
                <p className="text-white font-medium text-sm break-words line-clamp-6">{note.text}</p>
            )}
        </div>
    );
}