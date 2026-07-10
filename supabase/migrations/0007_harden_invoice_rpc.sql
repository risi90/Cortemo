-- Verdediging in de diepte: de functie controleert zelf al op beheerrechten,
-- maar anonieme clients hoeven hem überhaupt niet te kunnen aanroepen.
revoke execute on function public.cortemo_create_invoice(text) from anon;
