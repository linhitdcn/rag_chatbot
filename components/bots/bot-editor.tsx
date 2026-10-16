"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BotAvatar } from "@/components/shared/bot-avatar";
import { sources } from "@/lib/mock/data";
import { MODELS, botSchema, type BotFormValues } from "@/lib/validations/bot";
import type { Bot } from "@/lib/types";

function toValues(bot?: Bot): BotFormValues {
  return {
    name: bot?.name ?? "", description: bot?.description ?? "", status: bot?.status ?? "active",
    systemPrompt: bot?.systemPrompt ?? "You are a helpful assistant. Answer only from the provided context and cite your sources.",
    tone: bot?.tone ?? "friendly",
    welcomeMessage: bot?.welcomeMessage ?? "Hi! How can I help you today?",
    starterQuestions: (bot?.starterQuestions ?? []).map((value) => ({ value })),
    fallbackMessage: bot?.fallbackMessage ?? "Sorry, I couldn't find that. Would you like to talk to a human?",
    provider: bot?.provider ?? "openai", model: bot?.model ?? "gpt-4o-mini",
    temperature: bot?.temperature ?? 0.3, maxTokens: bot?.maxTokens ?? 800, topK: bot?.topK ?? 5,
    similarityThreshold: bot?.similarityThreshold ?? 0.72,
    sourceIds: bot?.sourceIds ?? [],
    citations: bot?.features.citations ?? true, leadCapture: bot?.features.leadCapture ?? false,
    leadFields: bot?.features.leadFields ?? ["email"], leadTiming: bot?.features.leadTiming ?? "after_3",
    handoffEmail: bot?.features.handoffEmail ?? "", feedback: bot?.features.feedback ?? true,
  };
}

function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="text-xs text-destructive">{message}</p> : null;
}

function SwitchRow({ control, name, label, description }: { control: Control<BotFormValues>; name: FieldPath<BotFormValues>; label: string; description: string }) {
  return (
    <Controller control={control} name={name} render={({ field }) => (
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor={name}>{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch id={name} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
      </div>
    )} />
  );
}

export function BotEditor({ bot }: { bot?: Bot }) {
  const router = useRouter();
  const isNew = !bot;
  const defaults = React.useMemo(() => toValues(bot), [bot]);
  const form = useForm<BotFormValues>({ resolver: zodResolver(botSchema) as never, defaultValues: defaults, mode: "onChange" });
  const { register, control, handleSubmit, watch, reset, setValue, formState: { errors, isDirty, isSubmitting } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "starterQuestions" });

  const provider = watch("provider");
  const prompt = watch("systemPrompt");
  const leadCapture = watch("leadCapture");
  const name = watch("name");
  const unsaved = isNew ? name.length > 0 : isDirty;

  // Unsaved-changes guard for tab close / reload.
  React.useEffect(() => {
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  async function onSubmit(values: BotFormValues) {
    await new Promise((r) => setTimeout(r, 600)); // Phase 2 replaces this with a Server Action.
    toast.success(isNew ? `“${values.name}” created` : "Changes saved");
    reset(values);
    if (isNew) router.push("/bots");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error("Please fix the highlighted fields."))} className="pb-20">
      <Tabs defaultValue="general" className="gap-6">
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
          {["general", "behavior", "model", "knowledge", "features"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <Card className="shadow-none">
            <CardHeader><CardTitle>General</CardTitle><CardDescription>Basic information shown to your team.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <BotAvatar name={name || "Bot"} color={bot?.avatarColor ?? "#6366f1"} className="size-14 text-lg" />
                <Button type="button" variant="outline" size="sm" onClick={() => toast.info("Avatar upload is wired up with Storage in the database phase.")}>
                  <Upload /> Upload avatar
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={2} {...register("description")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Controller control={control} name="status" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Behavior</CardTitle><CardDescription>Control how your bot talks and what it says when it doesn&apos;t know.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="systemPrompt">System prompt</Label>
                  <span className="text-xs text-muted-foreground tabular-nums">~{Math.ceil(prompt.length / 4)} tokens</span>
                </div>
                <Textarea id="systemPrompt" rows={6} className="font-mono text-[13px]" aria-invalid={!!errors.systemPrompt} {...register("systemPrompt")} />
                <FieldError message={errors.systemPrompt?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tone">Tone</Label>
                <Controller control={control} name="tone" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tone" className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="welcomeMessage">Welcome message</Label>
                <Input id="welcomeMessage" aria-invalid={!!errors.welcomeMessage} {...register("welcomeMessage")} />
                <FieldError message={errors.welcomeMessage?.message} />
              </div>
              <div className="space-y-2">
                <Label>Suggested starter questions</Label>
                {fields.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Input aria-label={`Starter question ${i + 1}`} {...register(`starterQuestions.${i}.value` as const)} />
                      <FieldError message={errors.starterQuestions?.[i]?.value?.message} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove question ${i + 1}`} onClick={() => remove(i)}><Trash2 /></Button>
                  </div>
                ))}
                {fields.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}><Plus /> Add question</Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fallbackMessage">Fallback message</Label>
                <Textarea id="fallbackMessage" rows={2} aria-invalid={!!errors.fallbackMessage} {...register("fallbackMessage")} />
                <p className="text-xs text-muted-foreground">Sent when no knowledge passes the similarity threshold.</p>
                <FieldError message={errors.fallbackMessage?.message} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Model</CardTitle><CardDescription>Pick the model and tune retrieval.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="provider">Provider</Label>
                  <Controller control={control} name="provider" render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => { field.onChange(v); setValue("model", MODELS[v as keyof typeof MODELS][0], { shouldDirty: true }); }}>
                      <SelectTrigger id="provider" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">Model</Label>
                  <Controller control={control} name="model" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="model" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{MODELS[provider].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <SliderField control={control} name="temperature" label="Temperature" min={0} max={1} step={0.05} hint="Lower is more deterministic." />
              <SliderField control={control} name="similarityThreshold" label="Similarity threshold" min={0.3} max={0.95} step={0.01} hint="Minimum match score for a chunk to be used." />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="maxTokens">Max tokens</Label>
                  <Input id="maxTokens" type="number" aria-invalid={!!errors.maxTokens} {...register("maxTokens", { valueAsNumber: true })} />
                  <FieldError message={errors.maxTokens?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="topK">Top-K chunks</Label>
                  <Input id="topK" type="number" aria-invalid={!!errors.topK} {...register("topK", { valueAsNumber: true })} />
                  <FieldError message={errors.topK?.message} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Knowledge</CardTitle><CardDescription>Choose which sources this bot is allowed to use.</CardDescription></CardHeader>
            <CardContent>
              <Controller control={control} name="sourceIds" render={({ field }) => (
                <ul className="divide-y rounded-lg border">
                  {sources.filter((s) => s.status === "ready").map((s) => {
                    const checked = field.value.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-accent/40">
                          <Checkbox checked={checked} onCheckedChange={(c) => field.onChange(c ? [...field.value, s.id] : field.value.filter((x) => x !== s.id))} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                          <span className="text-xs text-muted-foreground uppercase">{s.type}</span>
                          <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">{s.chunkCount} chunks</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card className="shadow-none">
            <CardHeader><CardTitle>Features</CardTitle><CardDescription>Enable the extras your visitors will see.</CardDescription></CardHeader>
            <CardContent className="divide-y">
              <SwitchRow control={control} name="citations" label="Show citations" description="Display numbered source references under answers." />
              <SwitchRow control={control} name="feedback" label="Collect feedback" description="Let visitors rate answers with thumbs up / down." />
              <div>
                <SwitchRow control={control} name="leadCapture" label="Lead capture" description="Ask visitors for contact details during the chat." />
                {leadCapture && (
                  <div className="mb-4 grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fields to collect</Label>
                      <Controller control={control} name="leadFields" render={({ field }) => (
                        <div className="flex gap-4">
                          {(["name", "email", "phone"] as const).map((f) => (
                            <label key={f} className="flex items-center gap-2 text-sm capitalize">
                              <Checkbox checked={field.value.includes(f)} onCheckedChange={(c) => field.onChange(c ? [...field.value, f] : field.value.filter((x) => x !== f))} />
                              {f}
                            </label>
                          ))}
                        </div>
                      )} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leadTiming">When to ask</Label>
                      <Controller control={control} name="leadTiming" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="leadTiming" className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="start">At the start</SelectItem>
                            <SelectItem value="after_3">After 3 messages</SelectItem>
                            <SelectItem value="on_unanswered">When the bot can&apos;t answer</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 py-4">
                <Label htmlFor="handoffEmail">Human handoff email</Label>
                <Input id="handoffEmail" type="email" placeholder="support@company.com" className="max-w-sm" aria-invalid={!!errors.handoffEmail} {...register("handoffEmail")} />
                <p className="text-xs text-muted-foreground">Conversations that need a person are forwarded here.</p>
                <FieldError message={errors.handoffEmail?.message} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {unsaved && (
        <div role="status" className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 md:left-[var(--sidebar-width)]">
          <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border bg-popover px-4 py-3 shadow-lg">
            <p className="text-sm">You have unsaved changes</p>
            <div className="flex gap-2">
              {!isNew && <Button type="button" variant="ghost" size="sm" onClick={() => reset(defaults)}>Discard</Button>}
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />} {isNew ? "Create bot" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function SliderField({ control, name, label, min, max, step, hint }: {
  control: Control<BotFormValues>; name: "temperature" | "similarityThreshold"; label: string; min: number; max: number; step: number; hint: string;
}) {
  return (
    <Controller control={control} name={name} render={({ field }) => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <span className="font-mono text-sm tabular-nums">{Number(field.value).toFixed(2)}</span>
        </div>
        <Slider min={min} max={max} step={step} value={[Number(field.value)]} onValueChange={([v]) => field.onChange(v)} aria-label={label} />
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    )} />
  );
}
