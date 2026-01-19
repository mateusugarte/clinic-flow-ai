import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, Utensils, CheckCircle } from "lucide-react";

export default function NutricaoConfirmacao() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <Card className="max-w-md shadow-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Nutrição e Confirmação</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Esta funcionalidade está em desenvolvimento e estará disponível em breve.
          </p>
          <div className="flex justify-center gap-6 pt-4">
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Utensils className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Nutrição</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Confirmação</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
