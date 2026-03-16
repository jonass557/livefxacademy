import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, TrendingUp, Shield, Brain, Target } from 'lucide-react';

const TradingInfo = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">Qu'est-ce que le <span className="text-primary">Trading</span> ?</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Le trading est l'activité d'achat et de vente d'actifs financiers sur les marchés dans le but de réaliser un profit.
        </p>
      </div>

      {/* What is Trading */}
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Comment ça marche ?
          </h2>
          <p className="text-muted-foreground">
            Le principe est simple : acheter un actif à un prix bas et le revendre plus cher (<strong>Long</strong>), 
            ou parier sur la baisse d'un actif (<strong>Short</strong>).
          </p>
          <p className="text-muted-foreground">
            Les marchés concernés incluent : <strong>Forex</strong> (devises), <strong>Actions</strong>, 
            <strong>Indices</strong>, <strong>Crypto-monnaies</strong>, et <strong>Matières premières</strong>.
          </p>
        </div>
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 rounded-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 text-white p-2 rounded">📈</div>
              <div>
                <p className="font-bold">Position Long (Achat)</p>
                <p className="text-sm text-muted-foreground">Vous gagnez si le prix monte</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-red-500 text-white p-2 rounded">📉</div>
              <div>
                <p className="font-bold">Position Short (Vente)</p>
                <p className="text-sm text-muted-foreground">Vous gagnez si le prix baisse</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Learn */}
      <div className="bg-muted/50 p-8 rounded-2xl space-y-6">
        <h2 className="text-2xl font-bold text-center">Pourquoi se former ?</h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          <strong className="text-destructive">90% des débutants perdent leur argent</strong> car ils voient le trading comme un jeu de hasard. 
          La formation est essentielle pour réussir.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="text-center space-y-2">
            <Shield className="h-10 w-10 text-primary mx-auto" />
            <h3 className="font-bold">Gestion du Risque</h3>
            <p className="text-sm text-muted-foreground">Protégez votre capital avec des règles strictes de money management</p>
          </div>
          <div className="text-center space-y-2">
            <Brain className="h-10 w-10 text-primary mx-auto" />
            <h3 className="font-bold">Psychologie</h3>
            <p className="text-sm text-muted-foreground">Maîtrisez vos émotions pour prendre des décisions rationnelles</p>
          </div>
          <div className="text-center space-y-2">
            <Target className="h-10 w-10 text-primary mx-auto" />
            <h3 className="font-bold">Stratégie</h3>
            <p className="text-sm text-muted-foreground">Apprenez des méthodes éprouvées pour entrer et sortir du marché</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-primary/10 p-6 rounded-xl space-y-4">
          <h3 className="text-xl font-bold">Évaluez votre niveau</h3>
          <p className="text-muted-foreground">
            Remplissez notre fiche de consultation gratuite pour recevoir un programme personnalisé adapté à votre profil.
          </p>
          <Link to="/consultation">
            <Button className="w-full gap-2">
              Consultation Gratuite <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="bg-muted p-6 rounded-xl space-y-4">
          <h3 className="text-xl font-bold">Inscrivez-vous maintenant</h3>
          <p className="text-muted-foreground">
            Rejoignez LiveFx Academy et accédez à nos formations, nos webinaires et notre communauté de traders.
          </p>
          <Link to="/register">
            <Button variant="outline" className="w-full gap-2">
              Créer un compte <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* For Trainers */}
      <div className="border-t pt-8">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold">Vous êtes un trader expérimenté ?</h3>
          <p className="text-muted-foreground">
            Rejoignez notre équipe de formateurs et partagez votre expertise.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/trainer-consultation">
              <Button variant="outline">Candidature Formateur</Button>
            </Link>
            <Link to="/trainer-register">
              <Button>S'inscrire comme Formateur</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingInfo;
