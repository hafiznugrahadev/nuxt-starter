<script setup lang="ts">
// Page title + breadcrumb card in the template's BaseBreadcrumb style
// (lightsecondary card, no decorative image).
defineProps<{
  title: string
  breadcrumbs: { text: string, to?: string }[]
}>()
</script>

<template>
  <Card class="bg-lightsecondary dark:bg-muted mb-7 overflow-hidden rounded-lg border-none py-4 px-6 shadow-none">
    <div class="relative flex items-center justify-between gap-6">
      <div>
        <h4 class="text-link dark:text-foreground mb-3 text-xl font-semibold">
          {{ title }}
        </h4>
        <Breadcrumb>
          <BreadcrumbList class="items-center whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink as-child>
                <NuxtLink
                  to="/admin"
                  class="text-link dark:text-darklink text-sm opacity-80"
                >
                  Home
                </NuxtLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <template
              v-for="(crumb, index) in breadcrumbs"
              :key="index"
            >
              <BreadcrumbItem>
                <BreadcrumbLink
                  v-if="index < breadcrumbs.length - 1 && crumb.to"
                  as-child
                >
                  <NuxtLink
                    :to="crumb.to"
                    class="text-link dark:text-darklink hover:underline text-sm"
                  >
                    {{ crumb.text }}
                  </NuxtLink>
                </BreadcrumbLink>
                <span
                  v-else
                  class="text-link dark:text-darklink text-sm font-medium"
                >{{ crumb.text }}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
            </template>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  </Card>
</template>
