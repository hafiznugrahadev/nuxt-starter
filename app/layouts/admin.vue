<script setup lang="ts">
// Admin shell copied from the template's FullLayout: collapsible sidebar on
// the left, sticky header on top, page content in a centered container.
</script>

<template>
  <SidebarProvider>
    <div class="bg-card flex min-h-screen w-full dark:bg-dark">
      <AdminSidebar />
      <SidebarInset class="bg-background dark:bg-dark min-w-0 flex-1">
        <AdminHeader />
        <main class="flex-grow">
          <div class="container mx-auto px-4 py-[30px] sm:px-6">
            <slot />
          </div>
        </main>
      </SidebarInset>
    </div>
  </SidebarProvider>
</template>
