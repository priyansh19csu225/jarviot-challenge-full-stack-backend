��- -   C r e a t e T a b l e 
 
 C R E A T E   T A B L E   " u s e r s "   ( 
 
         " u s e r _ e m a i l "   V A R C H A R   N O T   N U L L , 
 
         " a c c e s s _ t o k e n "   V A R C H A R , 
 
         " c r e a t e d _ a t "   T I M E S T A M P T Z ( 6 )   N O T   N U L L   D E F A U L T   C U R R E N T _ T I M E S T A M P , 
 
         " r e f r e s h _ t o k e n "   V A R C H A R , 
 
         " e x p i r e s _ a t "   T I M E S T A M P T Z ( 6 ) , 
 
 
 
         C O N S T R A I N T   " u s e r s _ d u p l i c a t e _ p k e y "   P R I M A R Y   K E Y   ( " u s e r _ e m a i l " ) 
 
 ) ; 
 
 
 
 