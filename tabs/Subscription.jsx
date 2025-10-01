import React from "react";
import { Section } from "../components/common";
import { Grid, Card, CardContent, Typography, Chip, Button } from "@mui/material";

export default function Subscription() {
  return (
    <Section title="Subscription" breadcrumbs={["Home", "Subscription"]}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-3">
              <Typography variant="subtitle1" className="font-semibold">Plan</Typography>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Pro (Yearly)</div>
                  <div className="text-sm text-slate-500">Up to 5 users, unlimited invoices</div>
                </div>
                <Chip color="primary" label="Active" />
              </div>
              <Button variant="outlined">Renew / Upgrade</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-3">
              <Typography variant="subtitle1" className="font-semibold">Billing</Typography>
              <div className="text-sm text-slate-500">Next renewal: Oct 31, 2025</div>
              <Button variant="outlined">View Invoices</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Section>
  );
}
