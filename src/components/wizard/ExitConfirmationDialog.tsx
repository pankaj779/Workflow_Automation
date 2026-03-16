 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from "@/components/ui/alert-dialog";
 
 interface ExitConfirmationDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: () => void;
 }
 
 export function ExitConfirmationDialog({
   open,
   onOpenChange,
   onConfirm,
 }: ExitConfirmationDialogProps) {
   return (
     <AlertDialog open={open} onOpenChange={onOpenChange}>
       <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle>Discard KPI creation?</AlertDialogTitle>
           <AlertDialogDescription>
             Are you sure you want to leave? All your progress will be lost and cannot be recovered.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AlertDialogCancel>Cancel</AlertDialogCancel>
           <AlertDialogAction
             onClick={onConfirm}
             className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
           >
             Discard
           </AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   );
 }