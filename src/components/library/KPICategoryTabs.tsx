import { cn } from "@/lib/utils";
import { LayoutGrid, TrendingUp, Settings, BarChart2, Zap, Clock } from "lucide-react";
 
 interface Category {
   id: string;
   name: string;
   icon: string;
   count: number;
 }
 
 interface KPICategoryTabsProps {
   categories: Category[];
   activeCategory: string;
   onCategoryChange: (id: string) => void;
 }
 
 const iconMap: Record<string, React.ReactNode> = {
   'grid': <LayoutGrid className="h-3.5 w-3.5" />,
   'trending-up': <TrendingUp className="h-3.5 w-3.5" />,
  'bar-chart': <BarChart2 className="h-3.5 w-3.5" />,
   'settings': <Settings className="h-3.5 w-3.5" />,
  'zap': <Zap className="h-3.5 w-3.5" />,
  'clock': <Clock className="h-3.5 w-3.5" />,
 };
 
 export function KPICategoryTabs({ categories, activeCategory, onCategoryChange }: KPICategoryTabsProps) {
   return (
     <div className="border-b border-border">
       <div className="flex items-center gap-1 overflow-x-auto pb-px">
         {categories.map((category) => (
           <button
             key={category.id}
             onClick={() => onCategoryChange(category.id)}
             className={cn(
               "flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap transition-colors border-b-2",
               activeCategory === category.id
                 ? "border-primary text-primary font-medium"
                 : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
             )}
           >
             {iconMap[category.icon] || <LayoutGrid className="h-3.5 w-3.5" />}
             {category.name}
             <span className={cn(
               "px-1.5 py-0.5 rounded-full text-xs",
               activeCategory === category.id
                 ? "bg-primary/10 text-primary"
                 : "bg-muted text-muted-foreground"
             )}>
               {category.count}
             </span>
           </button>
         ))}
       </div>
     </div>
   );
 }