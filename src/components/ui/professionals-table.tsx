"use client";

import { User, Clock, Briefcase } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Professional {
  id: string;
  name: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
  service_ids: string[];
  appointmentsCount?: number;
}

interface ProfessionalsTableProps {
  professionals: Professional[];
  services?: { id: string; name: string }[];
  onToggleActive?: (id: string, isActive: boolean) => void;
  onRowClick?: (professional: Professional) => void;
}

function ProfessionalsTable({ 
  professionals, 
  services = [],
  onToggleActive,
  onRowClick 
}: ProfessionalsTableProps) {
  const getServicesForProfessional = (serviceIds: string[]) => {
    return services
      .filter(s => serviceIds.includes(s.id))
      .map(s => s.name);
  };

  return (
    <div className="rounded-xl border bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Profissionais
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Nome</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Serviços</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ativo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {professionals.map((person) => (
            <TableRow 
              key={person.id} 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick?.(person)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {person.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={person.is_active ? "" : "text-muted-foreground line-through"}>
                    {person.name}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {person.start_time.slice(0, 5)} - {person.end_time.slice(0, 5)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap max-w-[200px]">
                  {getServicesForProfessional(person.service_ids).slice(0, 2).map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {person.service_ids.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{person.service_ids.length - 2}
                    </Badge>
                  )}
                  {person.service_ids.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhum</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={person.is_active ? "default" : "outline"}
                  className={person.is_active ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
                >
                  {person.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Switch
                  checked={person.is_active}
                  onCheckedChange={(checked) => {
                    onToggleActive?.(person.id, checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
            </TableRow>
          ))}
          {professionals.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhum profissional cadastrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default ProfessionalsTable;
