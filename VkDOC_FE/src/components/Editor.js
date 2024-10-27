import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import DocService from '../services/DocService';
import { useParams } from 'react-router-dom';
import { createEditor } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import InputWithDebounce from './InputWithDebounce';
import local from '../utils/local';

function EditorPage() {
    const editor = useMemo(() => withReact(createEditor()), []);
    const [documentContent, setDocumentContent] = useState([{ type: 'paragraph', children: [{ text: 'Loading...' }] }]);
    const [docName, setDocName] = useState('name');
    const socket = useWebSocket('ws://localhost:8080');
    let { documentId } = useParams();
    const [editorKey, setEditorKey] = useState(0);
    const user = local.getloggedInUser();

    // Fetch the document content when component mounts
    useEffect(() => {
        if (documentId !== 'new') {
            const fetchDocument = async () => {
                const doc = await DocService.getDocument(documentId);
                const content = doc.content?.length
                    ? doc.content
                    : [{ type: 'paragraph', children: [{ text: 'Some Value' }] }];

                setDocumentContent(content);
                setDocName(doc.title);
                setEditorKey(editorKey + 1);
            };
            fetchDocument();
        } else if (documentId === 'new') {
            const createDocument = async () => {
                documentId = await DocService.saveDocument(null, [{ type: 'paragraph', children: [{ text: 'Edit this line' }] }]);
            }
            createDocument();

        }
    }, [documentId]);

    const handleChange = useCallback((newValue) => {
        editor.operations.forEach(op => {
            if (op.type === 'insert_text' || op.type === 'remove_text') {
                socket.sendMessage({
                    documentId: documentId,
                    change: {
                        type: op.type,
                        path: op.path,
                        offset: op.offset,
                        text: op.text
                    },
                    userId: user.id,
                });
            }
        });
        setDocumentContent(newValue);
    }, [editor, socket, documentId]);


    return (
        <div>
            <InputWithDebounce key={editorKey} title={docName} documentId={documentId} userId={user.id} socket={socket} />
            <div className="editor-container">
                <Slate key={editorKey} editor={editor} initialValue={documentContent} onValueChange={handleChange}>
                    <Editable
                        placeholder="Start typing your document..."
                        className="editable-container"
                    />
                </Slate>
            </div>
        </div>
    );
}

export default EditorPage;
