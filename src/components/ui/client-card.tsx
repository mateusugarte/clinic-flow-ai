import * as React from "react";
import { motion } from "framer-motion";
import { User, Phone, Mail, Calendar, Clock, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ClientCardProps {
  clientName: string;
  phone: string;
  email?: string | null;
  appointmentCount: number;
  lastAppointmentDate?: string;
  tags?: string[];
  qualification?: string;
  onClick?: () => void;
  onEdit?: () => void;
}

const InfoItem = ({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) => (
  <div className="flex items-center gap-2">
    {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
    <div>
      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

export const ClientCard = ({
  clientName,
  phone,
  email,
  appointmentCount,
  lastAppointmentDate,
  tags,
  qualification,
  onClick,
  onEdit,
}: ClientCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
    >
      <Card 
        className={cn(
          "relative overflow-hidden cursor-pointer",
          "bg-card/80 backdrop-blur-sm border",
          "shadow-card hover:shadow-card-hover transition-all duration-300"
        )}
        onClick={onClick}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
        
        <CardHeader className="relative pb-3">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {clientName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground truncate">{clientName}</h3>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {appointmentCount}
                  </Badge>
                </div>
              </div>
              {qualification && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {qualification}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Telefone" value={phone} icon={Phone} />
            <InfoItem label="Email" value={email || "Não informado"} icon={Mail} />
          </div>
          
          {lastAppointmentDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Último agendamento: {lastAppointmentDate}</span>
            </div>
          )}
          
          {tags && tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        {onEdit && (
          <CardFooter className="relative pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
};
