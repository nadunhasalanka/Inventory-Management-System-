import React, { useState } from "react";
import { Section } from "../components/common";
import { Paper, Table, TableBody, TableCell, TableRow, Checkbox, TextField, Button, IconButton } from "@mui/material";
import { Delete } from "@mui/icons-material";

export default function Todo() {
  const [items, setItems] = useState([
    { id: 1, text: "Restock Mineral Water (order 200 units)", done: false },
    { id: 2, text: "Follow up with MRA logs for invoice #A-1205", done: true },
    { id: 3, text: "Collect payment from John P.", done: false },
  ]);
  const [text, setText] = useState("");

  return (
    <Section title="To-Do List" breadcrumbs={["Home", "Tasks"]}>
      <div className="flex gap-2 mb-3">
        <TextField fullWidth size="small" placeholder="New task..." value={text} onChange={(e) => setText(e.target.value)} />
        <Button variant="contained" onClick={() => { if (!text.trim()) return; setItems(prev => [{ id: Date.now(), text, done: false }, ...prev]); setText(""); }}>Add</Button>
      </div>
      <Paper className="rounded-2xl overflow-hidden">
        <Table>
          <TableBody>
            {items.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell width={64}><Checkbox checked={t.done} onChange={() => setItems(prev => prev.map(p => p.id === t.id ? { ...p, done: !p.done } : p))} /></TableCell>
                <TableCell className={t.done ? "line-through text-slate-400" : ""}>{t.text}</TableCell>
                <TableCell align="right"><IconButton color="error" onClick={() => setItems(prev => prev.filter(p => p.id !== t.id))}><Delete /></IconButton></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Section>
  );
}
