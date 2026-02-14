"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validations/host"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SlugInput } from "@/components/onboarding/slug-input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ProfileFormProps {
  defaultValues: {
    name: string
    description: string
    slug: string
  }
  hostId?: string
  onSubmit: (data: UpdateProfileInput) => Promise<void>
  submitLabel?: string
  isPending?: boolean
}

export function ProfileForm({
  defaultValues,
  hostId,
  onSubmit,
  submitLabel = "Continue",
  isPending = false,
}: ProfileFormProps) {
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues,
    mode: "onBlur",
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-tt-text-body">Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Your name"
                  className="text-base"
                />
              </FormControl>
              <FormMessage className="text-tt-error" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-tt-text-body">
                Description{" "}
                <span className="text-tt-text-muted font-normal">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="Tell your clients about yourself"
                  className="text-base resize-none"
                />
              </FormControl>
              <FormMessage className="text-tt-error" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-tt-text-body">Public URL</FormLabel>
              <FormControl>
                <SlugInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  excludeHostId={hostId}
                  error={
                    form.formState.errors.slug?.message
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending}
          className="mt-2 w-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white hover:opacity-90"
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  )
}
