"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { workspace } from "@/lib/mock/data";
import { workspaceSchema, type WorkspaceValues } from "@/lib/validations/settings";

const ZONES = ["Asia/Ho_Chi_Minh", "UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney"];

export function GeneralForm() {
  const { register, control, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<WorkspaceValues>({
    resolver: zodResolver(workspaceSchema) as never, defaultValues: { name: workspace.name, timezone: workspace.timezone },
  });
  React.useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty]);

  return (
    <form onSubmit={handleSubmit(async (v) => { await new Promise((r) => setTimeout(r, 500)); reset(v); toast.success("Workspace updated"); })} noValidate>
      <Card className="max-w-2xl shadow-none">
        <CardHeader><CardTitle>Workspace</CardTitle><CardDescription>Basic details for your organization.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">A</div>
            <Button type="button" variant="outline" size="sm" onClick={() => toast.info("Logo upload is connected to Storage in the database phase.")}><Upload /> Upload logo</Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input id="ws-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-tz">Default timezone</Label>
            <Controller control={control} name="timezone" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ws-tz" className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                <SelectContent>{ZONES.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t pt-6">
          <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => reset()}>Reset</Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Save changes</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
