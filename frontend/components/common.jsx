import React from "react";
import {
  Breadcrumbs,
  Typography,
  Divider,
  Link as MLink,
  Card,
  CardContent,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";

export function Section({ title, breadcrumbs = [], right, children }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <Breadcrumbs aria-label="breadcrumb" className="text-slate-500">
            {breadcrumbs.map((b, idx) => (
              <MLink key={idx} underline="hover" color={idx === breadcrumbs.length - 1 ? "text.primary" : "inherit"}>
                {b}
              </MLink>
            ))}
          </Breadcrumbs>
          <Typography variant="h5" className="font-semibold mt-1">{title}</Typography>
        </div>
        <div>{right}</div>
      </div>
      <Divider />
      {children}
    </div>
  );
}

export function KPI({ label, value }) {
  return (
    <Card className="shadow-sm rounded-2xl">
      <CardContent>
        <Typography className="text-slate-500" variant="body2">{label}</Typography>
        <Typography variant="h5" className="mt-1 font-bold">{value}</Typography>
      </CardContent>
    </Card>
  );
}

export function SearchInput({ placeholder, value, onChange }) {
  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
}
