"use client";

import * as React from "react";
import { Loader2, MoreHorizontal, Trash2, UserPlus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeMemberRole, inviteMember, removeMember } from "@/lib/actions/workspace";
import { inviteSchema, type InviteValues } from "@/lib/validations/settings";
import type { Role, TeamMember } from "@/lib/types";

export function TeamView({ initial, canManage }: { initial: TeamMember[]; canManage: boolean }) {
  const [members, setMembers] = React.useState<TeamMember[]>(initial);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<TeamMember | null>(null);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema) as never, defaultValues: { email: "", role: "editor" },
  });

  async function invite(v: InviteValues) {
    const res = await inviteMember(v);
    if (!res.ok) return void toast.error(res.error);
    setMembers((m) => [...m.filter((x) => x.email !== res.data.email), res.data]);
    toast.success(res.data.status === "active" ? `${v.email} was added to the workspace` : `Invitation sent to ${v.email}`);
    reset(); setInviteOpen(false);
  }

  return (
    <>
      <PageHeader title="Team" description="Invite teammates and control what they can do." actions={canManage && <Button onClick={() => setInviteOpen(true)}><UserPlus /> Invite member</Button>} />
      <Card className="max-w-3xl gap-0 divide-y p-0 shadow-none">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar><AvatarFallback>{(m.name === "—" ? m.email : m.name).slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name === "—" ? m.email : m.name}</p>
              <p className="truncate text-xs text-muted-foreground">{m.name === "—" ? "Invitation pending" : m.email}</p>
            </div>
            {m.status === "invited" && <Badge variant="outline">Invited</Badge>}
            {m.role === "owner" || !canManage ? <Badge variant="secondary" className="capitalize">{m.role}</Badge> : (
              <Select value={m.role} onValueChange={async (r) => {
                const res = await changeMemberRole(m.id, r as Exclude<Role, "owner">);
                if (!res.ok) return void toast.error(res.error);
                setMembers((p) => p.map((x) => (x.id === m.id ? { ...x, role: r as Role } : x))); toast.success("Role updated");
              }}>
                <SelectTrigger size="sm" className="w-28" aria-label={`Role for ${m.email}`}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="editor">Editor</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent>
              </Select>
            )}
            {m.role !== "owner" && canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.email}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end"><DropdownMenuItem variant="destructive" onClick={() => setRemoving(m)}><Trash2 /> Remove</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            ) : <span className="size-8" />}
          </div>
        ))}
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(invite)} className="space-y-4" noValidate>
            <DialogHeader><DialogTitle>Invite a teammate</DialogTitle><DialogDescription>They&apos;ll get an email with a link to join this workspace.</DialogDescription></DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" placeholder="name@company.com" aria-invalid={!!errors.email} {...register("email")} />
              {errors.email && <p role="alert" className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Role</Label>
              <Controller control={control} name="role" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="inv-role" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="editor">Editor — can edit bots & knowledge</SelectItem><SelectItem value="viewer">Viewer — read-only</SelectItem></SelectContent>
                </Select>
              )} />
            </div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />} Send invite</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title="Remove team member?"
        description={`${removing?.email} will immediately lose access to this workspace.`} confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return;
          const res = await removeMember(removing.id);
          if (!res.ok) toast.error(res.error);
          else { setMembers((m) => m.filter((x) => x.id !== removing.id)); toast.success("Member removed"); }
          setRemoving(null);
        }}
      />
    </>
  );
}
