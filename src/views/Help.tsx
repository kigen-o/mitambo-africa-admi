import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Book, MessageCircle, Mail, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
    {
        category: "Getting Started",
        icon: Book,
        questions: [
            {
                q: "What is Mitambo Africa Agency Suite?",
                a: "It is a comprehensive management platform designed for agencies to handle clients, projects, invoices, and team tasks in one unified workspace."
            },
            {
                q: "How do I add my first client?",
                a: "Navigate to the 'Clients' page from the sidebar and click the 'Add Client' button. Fill in the business details and save."
            }
        ]
    },
    {
        category: "Invoices & Payments",
        icon: ExternalLink,
        questions: [
            {
                q: "How do I generate an invoice?",
                a: "Go to the 'Invoices' page or a specific client's detail page, click 'New Invoice', select the client and items, then click save. You can then download the PDF."
            },
            {
                q: "Can I customize the currency?",
                a: "Yes, you can change the default currency and other financial settings in 'Settings' -> 'Financial Settings'."
            }
        ]
    },
    {
        category: "Project Management",
        icon: HelpCircle,
        questions: [
            {
                q: "How do I assign tasks to staff members?",
                a: "When creating or editing a task, use the 'Assigned To' dropdown to select a staff member. They will see this task on their Staff Dashboard."
            },
            {
                q: "What are project stages?",
                a: "Projects move through stages like Brief, Design, Review, Production, and Delivery. You can update these stages to track progress."
            }
        ]
    }
];

export default function Help() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
                <p className="text-muted-foreground mt-2">Everything you need to know about Mitambo Africa Agency Suite.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardHeader className="pb-3 text-center">
                        <div className="mx-auto h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2">
                            <Mail className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-sm">Email Support</CardTitle>
                        <CardDescription className="text-xs">support@mitambo.africa</CardDescription>
                    </CardHeader>
                </Card>

                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardHeader className="pb-3 text-center">
                        <div className="mx-auto h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2">
                            <Phone className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-sm">Call Us</CardTitle>
                        <CardDescription className="text-xs">+250 780 000 000</CardDescription>
                    </CardHeader>
                </Card>

                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardHeader className="pb-3 text-center">
                        <div className="mx-auto h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2">
                            <MessageCircle className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-sm">Live Chat</CardTitle>
                        <CardDescription className="text-xs">Available 9am - 5pm</CardDescription>
                    </CardHeader>
                </Card>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqs.map((category, idx) => (
                        <Card key={idx}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <category.icon className="h-4 w-4 text-primary" />
                                    <CardTitle className="text-base">{category.category}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    {category.questions.map((item, qIdx) => (
                                        <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`}>
                                            <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
                                            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                                                {item.a}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <Card className="bg-primary text-primary-foreground p-8 overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold">Still need help?</h3>
                        <p className="text-primary-foreground/80 max-w-md">Our dedicated support team is ready to assist you with any questions or technical issues.</p>
                    </div>
                    <Button variant="secondary" size="lg" className="font-bold">
                        Contact Support
                    </Button>
                </div>
                {/* Background decorative element */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl -z-0" />
            </Card>
        </div>
    );
}
